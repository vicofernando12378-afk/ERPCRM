<?php

namespace App\Http\Controllers;

use App\Domain\Documents;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Picqer\Barcode\BarcodeGeneratorSVG;
use Illuminate\Support\Facades\Storage;
use App\Domain\{Access, Operations};

class DocumentOutputController extends Controller
{
    public function pdf(Request $r, int $id)
    {
        $doc = (new ErpController)->detail($r, $id);
        $company = json_decode(DB::table('settings')->where('key', 'company')->value('value') ?? '{}', true);
        $options = new Options(['isRemoteEnabled' => false, 'isPhpEnabled' => false, 'defaultFont' => 'DejaVu Sans']);
        $pdf = new Dompdf($options);
        $pdf->loadHtml(view('documents.document', compact('doc', 'company'))->render());
        $pdf->setPaper('A4'); $pdf->render();
        return response($pdf->output(), 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline; filename="'.$doc['number'].'.pdf"', 'Cache-Control' => 'private, no-store']);
    }

    public function receipt(Request $r, int $id)
    {
        $payment = DB::table('payments')->find($id); abort_unless($payment, 404);
        $invoice = (new ErpController)->detail($r, $payment->invoice_id);
        $doc = $invoice;
        $doc['number'] = $payment->number; $doc['date'] = $payment->date; $doc['status'] = $payment->status;
        $doc['subtotal'] = $doc['total'] = $payment->amount; $doc['tax_total'] = 0;
        $doc['notes'] = 'Cobro aplicado a '.$invoice['number'].'. Referencia: '.$payment->reference;
        $doc['lines'] = [['description' => 'Pago de '.$invoice['number'], 'quantity' => '1', 'unit_price' => $payment->amount, 'discount_percent' => 0, 'tax_percent' => 0, 'total' => $payment->amount]];
        $company = json_decode(DB::table('settings')->where('key', 'company')->value('value') ?? '{}', true);
        $pdf = new Dompdf(new Options(['isRemoteEnabled' => false, 'isPhpEnabled' => false, 'defaultFont' => 'DejaVu Sans']));
        $pdf->loadHtml(view('documents.document', compact('doc', 'company'))->render()); $pdf->setPaper('A4'); $pdf->render();
        return response($pdf->output(), 200, ['Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline; filename="'.$payment->number.'.pdf"', 'Cache-Control' => 'private, no-store']);
    }

    public function barcode(Request $r, int $id)
    {
        abort_if($r->user()->role === 'customer', 403);
        $item = DB::table('items')->find($id); abort_unless($item, 404);
        $code = $item->barcode ?: $item->sku;
        abort_unless(preg_match('/^[\x20-\x7E]{1,80}$/', $code), 422, 'Código no compatible con Code 128. Usa caracteres ASCII.');
        $svg = (new BarcodeGeneratorSVG)->getBarcode($code, BarcodeGeneratorSVG::TYPE_CODE_128, 2, 55);
        return response()->view('documents.barcode', ['item' => $item, 'code' => $code, 'svg' => $svg])->header('Cache-Control', 'private, no-store');
    }

    public function image(Request $r, int $id)
    {
        abort_if($r->user()->role === 'customer', 403);
        $item = DB::table('items')->find($id); abort_unless($item?->image_path && Storage::disk('local')->exists($item->image_path), 404);
        return Storage::disk('local')->response($item->image_path, null, ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, max-age=60']);
    }
    public function saveImage(Request $r, int $id)
    {
        Access::require($r->user(), 'catalog.write'); abort_unless(DB::table('items')->where('id', $id)->exists(), 404);
        $r->validate(['file' => 'required|image|mimes:jpg,jpeg,png,webp|max:4096|dimensions:max_width=6000,max_height=6000']);
        $path = $r->file('file')->store('item-images', 'local');
        try {
            DB::transaction(function () use ($r, $id, $path) {
                DB::table('items')->where('id', $id)->update(['image_path' => $path, 'updated_at' => now()]);
                Operations::audit($r->user()->id, 'image-updated', 'items', $id);
            });
        } catch (\Throwable $e) { Storage::disk('local')->delete($path); throw $e; }
        return ['success' => true];
    }

    public function email(Request $r, int $id)
    {
        $doc = (new ErpController)->detail($r, $id);
        Access::require($r->user(), match ($doc['type']) { 'purchase', 'receipt' => 'purchase.write', 'shipment' => 'shipment.write', 'invoice' => 'invoice.write', default => 'sales.write' });
        $data = $r->validate(['to' => 'required|email|max:180', 'subject' => 'required|string|max:180', 'message' => 'required|string|max:5000']);
        $company = json_decode(DB::table('settings')->where('key', 'company')->value('value') ?? '{}', true);
        return Operations::run($r->user()->id, (string) $r->header('Idempotency-Key'), 'email:'.$id, $data, function () use ($r, $id, $data, $doc, $company) {
            // Queue uses the same database transaction; immutable snapshot matches the requested document.
            \Illuminate\Support\Facades\Mail::to($data['to'])->queue(new \App\Mail\CommercialDocument($doc, $company, $data['subject'], $data['message']));
            Operations::audit($r->user()->id, 'email-queued', 'documents', $id, ['to' => $data['to']]);
            return ['queued' => true, 'message' => 'Documento en cola de envío.'];
        });
    }
}
