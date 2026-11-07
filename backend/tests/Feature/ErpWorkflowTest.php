<?php

namespace Tests\Feature;

use App\Mail\CommercialDocument;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Tests\TestCase;

class ErpWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin', 'active' => true]);
        $this->actingAs($this->admin);
        $ts = ['created_at' => now(), 'updated_at' => now()];
        foreach (['customers', 'suppliers', 'units', 'payment_methods'] as $table) {
            DB::table($table)->insert(['id' => 1, 'name' => 'Prueba'] + $ts);
        }
        DB::table('locations')->insert([['id' => 1, 'code' => 'A', 'name' => 'Almacén A'] + $ts, ['id' => 2, 'code' => 'B', 'name' => 'Almacén B'] + $ts]);
        DB::table('items')->insert([['id' => 1, 'sku' => '001', 'name' => 'Producto A', 'unit_id' => 1] + $ts, ['id' => 2, 'sku' => '002', 'name' => 'Producto B', 'unit_id' => 1] + $ts]);
    }

    private function postOperation(string $url, array $data = [], ?string $key = null)
    {
        return $this->withHeader('Idempotency-Key', $key ?? (string) Str::uuid())->postJson('/api/v1/'.$url, $data);
    }

    private function createDoc(string $type = 'order', array $lines = []): array
    {
        return $this->postOperation('documents/type/'.$type, [$type === 'purchase' ? 'supplier_id' : 'customer_id' => 1, 'location_id' => 1, 'date' => '2026-11-07', 'currency' => 'PEN', 'lines' => $lines ?: [['item_id' => 1, 'quantity' => '10.000', 'unit_price' => '10.00', 'discount_percent' => '10.00', 'tax_percent' => '18.00']]])->assertOk()->json();
    }

    private function derive(array $doc, string $type, string $quantity): array
    {
        return $this->postOperation('documents/'.$doc['id'].'/derive/'.$type, ['date' => '2026-11-07', 'lines' => [['line_id' => $doc['lines'][0]['id'], 'quantity' => $quantity]]])->assertOk()->json();
    }

    private function adjust(string $qty, int $item = 1)
    {
        return $this->postOperation('stock/adjust', ['item_id' => $item, 'location_id' => 1, 'quantity' => $qty, 'reason' => 'Apertura de prueba']);
    }

    public function test_partial_purchase_invoice_payment_and_shipment_are_reconciled(): void
    {
        $purchase = $this->createDoc('purchase');
        $this->assertDatabaseCount('stock_moves', 0);
        $this->derive($purchase, 'receipt', '4');
        $this->derive($purchase, 'receipt', '6');
        $this->assertDatabaseHas('stock_balances', ['item_id' => 1, 'location_id' => 1, 'quantity' => 10]);
        $order = $this->createDoc();
        $invoice = $this->derive($order, 'invoice', '3');
        $this->assertEquals('31.86', $invoice['total']);
        $this->assertEquals('4.86', $invoice['tax_total']);
        $shipment = $this->derive($order, 'shipment', '2');
        $this->assertDatabaseHas('stock_balances', ['item_id' => 1, 'quantity' => 7]);
        $key = (string) Str::uuid();
        $paymentData = ['amount' => '5.00', 'date' => '2026-11-07', 'payment_method_id' => 1];
        $payment = $this->postOperation('documents/'.$invoice['id'].'/pay', $paymentData, $key)->assertOk()->json();
        $this->postOperation('documents/'.$invoice['id'].'/pay', $paymentData, $key)->assertOk()->assertJsonPath('id', $payment['id']);
        $this->assertDatabaseCount('payments', 1);
        $this->assertDatabaseHas('documents', ['id' => $invoice['id'], 'paid' => 5]);
        $this->postOperation('documents/'.$invoice['id'].'/pay', $paymentData + ['reference' => 'changed'], $key)->assertStatus(409);
        $this->postOperation('documents/'.$invoice['id'].'/cancel', ['reason' => 'Corrección de prueba'])->assertStatus(422);
        $this->postOperation('payments/'.$payment['id'].'/cancel', ['reason' => 'Corrección de prueba'])->assertOk();
        $this->postOperation('documents/'.$shipment['id'].'/cancel', ['reason' => 'Corrección de prueba'])->assertOk();
        $this->postOperation('documents/'.$invoice['id'].'/cancel', ['reason' => 'Corrección de prueba'])->assertOk();
        $this->assertDatabaseHas('stock_balances', ['item_id' => 1, 'quantity' => 10]);
        $full = $this->derive($order, 'invoice', '10');
        $this->assertEquals('106.20', $full['total']);
        $this->assertDatabaseHas('stock_balances', ['item_id' => 1, 'quantity' => 0]);
    }

    public function test_partial_invoice_3_and_7_completes_only_ten_units(): void
    {
        $this->adjust('10')->assertOk();
        $order = $this->createDoc();
        $this->derive($order, 'invoice', '3');
        $this->derive($order, 'invoice', '7');
        $this->postOperation('documents/'.$order['id'].'/derive/invoice', ['date' => '2026-11-07', 'lines' => [['line_id' => $order['lines'][0]['id'], 'quantity' => 1]]])->assertStatus(422);
        $this->assertDatabaseHas('stock_balances', ['quantity' => 0]);
    }

    public function test_multiline_failure_rolls_back_document_sequence_and_all_stock_changes(): void
    {
        $this->adjust('10')->assertOk();
        $order = $this->createDoc('order', [['item_id' => 1, 'quantity' => 2, 'unit_price' => 10], ['item_id' => 2, 'quantity' => 2, 'unit_price' => 10]]);
        $data = ['date' => '2026-11-07', 'lines' => array_map(fn ($l) => ['line_id' => $l['id'], 'quantity' => 2], $order['lines'])];
        $this->postOperation('documents/'.$order['id'].'/derive/invoice', $data)->assertStatus(422);
        $this->assertDatabaseHas('stock_balances', ['item_id' => 1, 'quantity' => 10]);
        $this->assertDatabaseCount('documents', 1);
        $this->assertDatabaseCount('stock_moves', 1);
        $this->adjust('2', 2)->assertOk();
        $this->postOperation('documents/'.$order['id'].'/derive/invoice', $data)->assertOk()->assertJsonPath('number', 'FAC-00000001');
        $this->assertDatabaseHas('stock_balances', ['item_id' => 1, 'quantity' => 8]);
    }

    public function test_receiving_excess_or_foreign_line_is_rejected(): void
    {
        $first = $this->createDoc('purchase');
        $other = $this->createDoc('purchase');
        foreach ([[$first['lines'][0]['id'], 11], [$other['lines'][0]['id'], 1]] as [$line, $qty]) {
            $this->postOperation('documents/'.$first['id'].'/derive/receipt', ['date' => '2026-11-07', 'lines' => [['line_id' => $line, 'quantity' => $qty]]])->assertStatus(422);
        }
        $this->assertDatabaseCount('stock_moves', 0);
    }

    public function test_transfer_conserves_stock_and_cannot_go_negative(): void
    {
        $this->adjust('10')->assertOk();
        $data = ['from_location_id' => 1, 'to_location_id' => 2, 'reason' => 'Reposición de almacén', 'lines' => [['item_id' => 1, 'quantity' => 4]]];
        $this->postOperation('stock/transfer', $data)->assertOk();
        $this->assertEquals(10, DB::table('stock_balances')->sum('quantity'));
        $data['lines'][0]['quantity'] = 7;
        $this->postOperation('stock/transfer', $data)->assertStatus(422);
        $this->assertDatabaseHas('stock_balances', ['location_id' => 1, 'quantity' => 6]);
        $this->assertDatabaseCount('stock_moves', 3);
    }

    public function test_server_permissions_and_customer_document_isolation(): void
    {
        $order = $this->createDoc();
        $staff = User::factory()->create(['role' => 'sales']);
        $this->actingAs($staff);
        $this->adjust('10')->assertForbidden();
        $this->getJson('/api/v1/users')->assertForbidden();
        $customer = User::factory()->create(['role' => 'customer', 'customer_id' => 1]);
        $this->actingAs($customer);
        $this->getJson('/api/v1/documents/'.$order['id'])->assertOk();
        $this->getJson('/api/v1/catalog/customers')->assertForbidden();
        $customer->forceFill(['customer_id' => null])->save();
        $this->getJson('/api/v1/documents/'.$order['id'])->assertForbidden();
        $this->getJson('/api/v1/documents/type/order')->assertJsonPath('total', 0);
    }

    public function test_no_auth_bypass_and_disabled_user_denied(): void
    {
        auth()->logout();
        $this->withHeaders(['x-test-bypass' => 'true', 'x-test-role' => 'admin'])->getJson('/api/v1/dashboard')->assertUnauthorized();
        $this->admin->forceFill(['active' => false])->save();
        $this->actingAs($this->admin);
        $this->getJson('/api/v1/dashboard')->assertUnauthorized();
    }

    public function test_bad_amounts_and_duplicate_lines_are_rejected(): void
    {
        $this->adjust('0')->assertStatus(422);
        $this->adjust('1.0001')->assertStatus(422);
        $line = ['item_id' => 1, 'quantity' => 1, 'unit_price' => 10];
        $this->postOperation('documents/type/order', ['customer_id' => 1, 'location_id' => 1, 'date' => '2026-11-07', 'currency' => 'PEN', 'lines' => [$line, $line]])->assertStatus(422);
        $this->assertDatabaseCount('documents', 0);
    }

    public function test_dashboard_totals_do_not_depend_on_first_page(): void
    {
        for ($i = 0; $i < 23; $i++) {
            $this->createDoc();
        }
        $this->getJson('/api/v1/documents/type/order')->assertJsonCount(20, 'data')->assertJsonPath('total', 23);
        $this->getJson('/api/v1/documents/type/order?page=2')->assertJsonCount(3, 'data');
        $this->getJson('/api/v1/dashboard')->assertJsonPath('orders', 23);
    }

    public function test_direct_sale_and_overpayment(): void
    {
        $this->adjust('10')->assertOk();
        $invoice = $this->createDoc('direct-sale');
        $this->assertEquals('invoice', $invoice['type']);
        $this->assertDatabaseCount('documents', 2);
        $this->postOperation('documents/'.$invoice['id'].'/pay', ['amount' => 107, 'date' => '2026-11-07', 'payment_method_id' => 1])->assertStatus(422);
        $this->assertDatabaseCount('payments', 0);
    }

    public function test_pdf_and_barcode_require_authorization(): void
    {
        $order = $this->createDoc();
        $response = $this->get('/api/v1/documents/'.$order['id'].'/pdf');
        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
        $this->get('/api/v1/items/1/barcode')->assertOk()->assertSee('001');
        $this->actingAs(User::factory()->create(['role' => 'customer']));
        $this->getJson('/api/v1/documents/'.$order['id'].'/pdf')->assertForbidden();
        $this->getJson('/api/v1/items/1/barcode')->assertForbidden();
    }

    public function test_csv_is_previewed_and_imported_atomically_without_duplicate_retries(): void
    {
        $upload = fn ($body) => UploadedFile::fake()->createWithContent('categories.csv', $body);
        $this->post('/api/v1/imports/categories', ['file' => $upload("name\nCategoría nueva\n"), 'apply' => 0], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('valid_rows', 1)->assertJsonPath('applied', false);
        $this->assertDatabaseCount('categories', 0);
        $key = (string) Str::uuid();
        for ($i = 0; $i < 2; $i++) {
            $this->withHeader('Idempotency-Key', $key)->post('/api/v1/imports/categories', ['file' => $upload("name\nCategoría nueva\n"), 'apply' => 1], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('applied', true);
        }
        $this->assertDatabaseCount('categories', 1);
        $this->withHeader('Idempotency-Key', (string) Str::uuid())->post('/api/v1/imports/categories', ['file' => $upload("name\nOtra categoría\nOtra categoría\n"), 'apply' => 1], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('applied', false);
        $this->assertDatabaseCount('categories', 1);
    }

    public function test_document_email_is_queued_once_and_requires_permission(): void
    {
        Mail::fake();
        $order = $this->createDoc();
        $payload = ['to' => 'customer@example.test', 'subject' => 'Pedido', 'message' => 'Documento solicitado.'];
        $key = (string) Str::uuid();
        $url = 'documents/'.$order['id'].'/email';
        $this->postOperation($url, $payload, $key)->assertOk()->assertJsonPath('queued', true);
        $this->postOperation($url, $payload, $key)->assertOk();
        Mail::assertQueued(CommercialDocument::class, 1);
        Mail::assertQueued(CommercialDocument::class, function ($mail) use ($order) {
            $mail->build();
            $this->assertStringStartsWith('%PDF-', $mail->rawAttachments[0]['data']);

            return $mail->documentSnapshot['id'] === $order['id'];
        });
        $this->actingAs(User::factory()->create(['role' => 'warehouse']));
        $this->postOperation($url, $payload)->assertForbidden();
    }

    public function test_custom_roles_apply_immediately_and_cannot_grant_admin(): void
    {
        $payload = ['slug' => 'buyer', 'name' => 'Comprador', 'permissions' => ['purchase.write']];
        $this->putJson('/api/v1/roles', $payload)->assertOk();
        $buyer = User::factory()->create(['role' => 'buyer']);
        $this->actingAs($buyer);
        $this->createDoc('purchase');
        $this->adjust('1')->assertForbidden();
        $this->putJson('/api/v1/roles', $payload)->assertForbidden();
        $this->actingAs($this->admin);
        $this->putJson('/api/v1/roles', array_replace($payload, ['permissions' => ['admin']]))->assertStatus(422);
        $this->putJson('/api/v1/roles', array_replace($payload, ['permissions' => []]))->assertOk();
        $this->actingAs($buyer);
        $this->postOperation('documents/type/purchase', [])->assertForbidden();
    }

    public function test_password_reset_uses_single_use_token_without_sending_real_mail(): void
    {
        Notification::fake();
        auth()->logout();
        $this->postJson('/api/v1/forgot-password', ['email' => $this->admin->email])->assertOk();
        Notification::assertSentTo($this->admin, ResetPassword::class);
        $token = Password::createToken($this->admin);
        $data = ['email' => $this->admin->email, 'token' => $token, 'password' => 'SecureTest2026!', 'password_confirmation' => 'SecureTest2026!'];
        $this->postJson('/api/v1/reset-password', $data)->assertOk();
        $this->postJson('/api/v1/reset-password', $data)->assertStatus(422);
        $this->postJson('/api/v1/login', ['email' => $this->admin->email, 'password' => 'SecureTest2026!'])->assertOk()->assertJsonPath('user.role', 'admin');
    }
}
