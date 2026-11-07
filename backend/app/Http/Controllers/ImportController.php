<?php

namespace App\Http\Controllers;

use App\Domain\{Access, Operations};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Validator};

class ImportController extends Controller
{
    private const FIELDS = [
        'customers' => ['name', 'tax_id', 'email', 'phone', 'address'],
        'suppliers' => ['name', 'tax_id', 'email', 'phone', 'address'],
        'categories' => ['name'],
        'items' => ['sku', 'name', 'unit_id', 'category_id', 'tax_id', 'purchase_price', 'sale_price', 'min_stock', 'barcode', 'description'],
    ];
    public function template(Request $r, string $table)
    {
        Access::require($r->user(), 'catalog.write'); abort_unless(isset(self::FIELDS[$table]), 404);
        return response(implode(',', self::FIELDS[$table])."\n", 200, ['Content-Type' => 'text/csv; charset=UTF-8', 'Content-Disposition' => 'attachment; filename="'.$table.'-plantilla.csv"']);
    }
    public function import(Request $r, string $table)
    {
        Access::require($r->user(), 'catalog.write'); abort_unless(isset(self::FIELDS[$table]), 404);
        $r->validate(['file' => 'required|file|max:2048', 'apply' => 'sometimes|boolean']);
        $fingerprint = ['sha256' => hash_file('sha256', $r->file('file')->getRealPath())];
        if ($r->boolean('apply')) {
            $previous = DB::table('operations')->where(['user_id' => $r->user()->id, 'key' => (string) $r->header('Idempotency-Key')])->first();
            if ($previous && $previous->result !== null) {
                abort_if($previous->request_hash !== hash('sha256', json_encode(['import:'.$table, $fingerprint], JSON_THROW_ON_ERROR)), 409, 'La clave fue usada para otro archivo.');
                return json_decode($previous->result, true);
            }
        }
        $handle = fopen($r->file('file')->getRealPath(), 'r');
        $header = fgetcsv($handle, 0, ',', '"', '');
        abort_unless($header, 422, 'El CSV está vacío.');
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]);
        abort_unless($header === self::FIELDS[$table], 422, 'Las columnas no coinciden con la plantilla.');
        $rows = []; $errors = []; $number = 1; $seen = [];
        $rules = ['name' => 'required|string|max:180'];
        if (in_array($table, ['customers', 'suppliers'])) $rules += ['tax_id' => 'nullable|string|max:50', 'email' => 'nullable|email|max:180', 'phone' => 'nullable|string|max:50', 'address' => 'nullable|string|max:2000'];
        if ($table === 'categories') $rules['name'] .= '|unique:categories,name';
        if ($table === 'items') $rules += ['sku' => 'required|string|max:80|unique:items,sku', 'unit_id' => 'required|integer|exists:units,id', 'category_id' => 'nullable|integer|exists:categories,id', 'tax_id' => 'nullable|integer|exists:taxes,id', 'purchase_price' => 'required|numeric|min:0|max:1000000|decimal:0,2', 'sale_price' => 'required|numeric|min:0|max:1000000|decimal:0,2', 'min_stock' => 'required|numeric|min:0|max:1000000|decimal:0,3', 'barcode' => 'nullable|string|max:100', 'description' => 'nullable|string|max:5000'];
        while (($values = fgetcsv($handle, 0, ',', '"', '')) !== false) {
            $number++; abort_if($number > 1001, 422, 'Máximo 1000 filas por archivo.');
            if ($values === [null]) continue;
            if (count($values) !== count($header)) { $errors[] = ['row' => $number, 'errors' => ['Número de columnas incorrecto.']]; continue; }
            $row = array_combine($header, array_map(fn ($v) => $v === '' ? null : $v, $values));
            $validator = Validator::make($row, $rules);
            if ($validator->fails()) { $errors[] = ['row' => $number, 'errors' => $validator->errors()->all()]; continue; }
            $uniqueKey = $table === 'items' ? $row['sku'] : ($table === 'categories' ? $row['name'] : null);
            if ($uniqueKey !== null && isset($seen[mb_strtolower($uniqueKey)])) { $errors[] = ['row' => $number, 'errors' => ['Clave duplicada dentro del archivo.']]; continue; }
            if ($uniqueKey !== null) $seen[mb_strtolower($uniqueKey)] = true;
            $rows[] = $validator->validated();
        }
        fclose($handle);
        if (! $r->boolean('apply') || $errors) return ['applied' => false, 'valid_rows' => count($rows), 'errors' => $errors, 'preview' => array_slice($rows, 0, 10)];
        abort_unless(count($rows), 422, 'No hay filas válidas.');
        return Operations::run($r->user()->id, (string) $r->header('Idempotency-Key'), 'import:'.$table, $fingerprint, function () use ($r, $rows, $table) {
            foreach ($rows as $row) DB::table($table)->insert($row + ['active' => true, 'created_at' => now(), 'updated_at' => now()]);
            Operations::audit($r->user()->id, 'imported', $table, 0, ['rows' => count($rows)]);
            return ['applied' => true, 'valid_rows' => count($rows), 'errors' => []];
        });
    }
}
