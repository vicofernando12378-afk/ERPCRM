<?php

namespace App\Http\Controllers;

use App\Domain\Access;
use App\Domain\Operations;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    public const TABLES = ['customers', 'suppliers', 'locations', 'branches', 'categories', 'units', 'taxes', 'payment_methods', 'price_lists', 'prices', 'items'];

    public function index(Request $r, string $table)
    {
        abort_unless(in_array($table, self::TABLES, true), 404);
        abort_if($r->user()->role === 'customer', 403);
        $data = $r->validate(['q' => 'nullable|string|max:100', 'per_page' => 'sometimes|integer|min:1|max:100', 'active' => 'sometimes|boolean', 'page' => 'sometimes|integer|min:1']);
        $query = DB::table($table);
        if (isset($data['active'])) $query->where('active', $data['active']);
        if (! empty($data['q']) && $table !== 'prices') $query->where(function ($q) use ($table, $data) {
            $q->where('name', 'like', '%'.$data['q'].'%');
            if ($table === 'items') $q->orWhere('sku', 'like', '%'.$data['q'].'%')->orWhere('barcode', $data['q']);
        });
        return $query->orderByDesc('id')->paginate($data['per_page'] ?? 20);
    }

    public function save(Request $r, string $table, ?int $id = null)
    {
        abort_unless(in_array($table, self::TABLES, true), 404);
        Access::require($r->user(), 'catalog.write');
        if ($id) abort_unless(DB::table($table)->where('id', $id)->exists(), 404);
        $rules = ['name' => 'required|string|max:180', 'active' => 'sometimes|boolean'];
        if (in_array($table, ['categories', 'units', 'taxes', 'payment_methods', 'price_lists'])) $rules['name'] = ['required', 'string', 'max:180', Rule::unique($table)->ignore($id)];
        if (in_array($table, ['customers', 'suppliers', 'locations'])) $rules += ['email' => 'nullable|email|max:180', 'phone' => 'nullable|string|max:50', 'address' => 'nullable|string|max:2000'];
        if (in_array($table, ['customers', 'suppliers'])) $rules['tax_id'] = 'nullable|string|max:50';
        if ($table === 'locations') $rules['code'] = ['required', 'string', 'max:30', Rule::unique('locations')->ignore($id)];
        if ($table === 'branches') $rules += ['customer_id' => 'required|exists:customers,id', 'contact' => 'nullable|string|max:180', 'billing_address' => 'nullable|string|max:2000', 'shipping_address' => 'nullable|string|max:2000'];
        if ($table === 'taxes') $rules['rate'] = 'required|numeric|min:0|max:100|decimal:0,2';
        if ($table === 'items') $rules += ['sku' => ['required', 'string', 'max:80', Rule::unique('items')->ignore($id)], 'description' => 'nullable|string|max:5000', 'category_id' => 'nullable|exists:categories,id', 'unit_id' => 'required|exists:units,id', 'tax_id' => 'nullable|exists:taxes,id', 'purchase_price' => 'required|numeric|min:0|max:1000000|decimal:0,2', 'sale_price' => 'required|numeric|min:0|max:1000000|decimal:0,2', 'min_stock' => 'required|numeric|min:0|max:1000000|decimal:0,3', 'barcode' => 'nullable|string|max:100'];
        if ($table === 'prices') $rules = ['item_id' => 'required|exists:items,id', 'price_list_id' => 'required|exists:price_lists,id', 'currency' => 'required|in:PEN,USD,EUR', 'price' => 'required|numeric|min:0|max:1000000|decimal:0,2'];
        $data = $r->validate($rules);
        return DB::transaction(function () use ($r, $table, $id, $data) {
            if ($table === 'prices') {
                $existing = DB::table('prices')->where(['item_id' => $data['item_id'], 'price_list_id' => $data['price_list_id'], 'currency' => $data['currency']])->when($id, fn ($q) => $q->where('id', '!=', $id))->exists();
                abort_if($existing, 422, 'Ya existe ese precio para producto, tarifa y moneda.');
            }
            $data['updated_at'] = now();
            if ($id) DB::table($table)->where('id', $id)->update($data);
            else $id = DB::table($table)->insertGetId($data + ['created_at' => now()]);
            Operations::audit($r->user()->id, 'saved', $table, $id, $data);
            return (array) DB::table($table)->find($id);
        });
    }
}
