<!doctype html>
<html lang="es"><head><meta charset="utf-8"><style>
@page { margin: 35px; } body { font-family: 'DejaVu Sans', sans-serif; font-size: 10px; color: #243149; }
h1 { font-size: 22px; color: #1d4d8d; margin-bottom: 6px; } h2 { font-size: 17px; } .muted { color: #708096; }
table { width: 100%; border-collapse: collapse; margin: 20px 0; } th { background: #eef3fa; text-align: left; } td,th { padding: 9px 6px; border-bottom: 1px solid #e3e9f2; } tr { page-break-inside: avoid; } .right { text-align: right; } .footer { position: fixed; bottom: 0; font-size: 8px; color: #708096; }
</style></head><body>
<h1>{{ $company['name'] ?? 'Empresa' }}</h1><p>{{ $company['tax_id'] ?? '' }} · {{ $company['address'] ?? '' }}</p>
<h2>{{ $doc['number'] }} @if($doc['status'] === 'cancelled') · ANULADO @endif</h2>
<p>Fecha: {{ $doc['date'] }} · Moneda: {{ $doc['currency'] }}</p>
<p><strong>{{ $doc['party_snapshot']['name'] ?? '' }}</strong><br>{{ $doc['party_snapshot']['tax_id'] ?? '' }}<br>{{ $doc['party_snapshot']['address'] ?? '' }}</p>
<table><thead><tr><th>Descripción</th><th>Cantidad</th><th>Precio</th><th>Dto. %</th><th>Imp. %</th><th>Total</th></tr></thead><tbody>
@foreach($doc['lines'] as $line)<tr><td>{{ $line['description'] }}</td><td>{{ $line['quantity'] }}</td><td>{{ $line['unit_price'] }}</td><td>{{ $line['discount_percent'] }}</td><td>{{ $line['tax_percent'] }}</td><td>{{ $line['total'] }}</td></tr>@endforeach
</tbody></table><p class="right">Subtotal: {{ $doc['subtotal'] }}<br>Impuestos: {{ $doc['tax_total'] }}</p><h2 class="right">Total: {{ $doc['currency'] }} {{ $doc['total'] }}</h2>
<p>{{ $doc['notes'] }}</p><p class="footer">Documento comercial interno. No acredita emisión fiscal electrónica.</p>
</body></html>
