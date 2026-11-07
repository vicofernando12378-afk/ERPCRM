<?php

namespace App\Console\Commands;

use App\Domain\Decimal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReconcileErp extends Command
{
    protected $signature = 'erp:reconcile';
    protected $description = 'Verificar existencias, libro de movimientos, totales y saldos sin modificar datos';

    public function handle(): int
    {
        $issues = [];
        foreach (DB::table('stock_balances')->orderBy('id')->lazy() as $balance) {
            $sum = DB::table('stock_moves')->where(['item_id' => $balance->item_id, 'location_id' => $balance->location_id])->sum('quantity');
            if (Decimal::units((string) $sum, 3) !== Decimal::units($balance->quantity, 3)) $issues[] = 'Saldo de inventario diferente al libro: '.$balance->id;
        }
        foreach (DB::table('documents')->orderBy('id')->lazy() as $doc) {
            $sum = DB::table('document_lines')->where('document_id', $doc->id)->sum('total');
            if (Decimal::units((string) $sum) !== Decimal::units($doc->total)) $issues[] = 'Total de líneas diferente a cabecera: '.$doc->number;
            if ($doc->type === 'invoice') {
                $paid = DB::table('payments')->where(['invoice_id' => $doc->id, 'status' => 'confirmed'])->sum('amount');
                if (Decimal::units((string) $paid) !== Decimal::units($doc->paid)) $issues[] = 'Cobros diferentes a saldo registrado: '.$doc->number;
            }
        }
        foreach ($issues as $issue) $this->error($issue);
        if ($issues) return self::FAILURE;
        $this->info('Conciliación correcta: inventario, movimientos, documentos y cobros sin diferencias.');
        return self::SUCCESS;
    }
}
