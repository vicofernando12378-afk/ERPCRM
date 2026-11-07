<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $t) {
            $t->id(); $t->string('name'); $t->string('tax_id')->nullable();
            $t->string('email')->nullable(); $t->string('phone')->nullable();
            $t->text('address')->nullable(); $t->boolean('active')->default(true); $t->timestamps();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->string('role')->default('sales'); $t->boolean('active')->default(true);
            $t->foreignId('customer_id')->nullable()->constrained()->restrictOnDelete();
        });
        foreach (['suppliers', 'locations'] as $table) {
            Schema::create($table, function (Blueprint $t) use ($table) {
                $t->id(); $t->string('name');
                if ($table === 'locations') $t->string('code')->unique();
                else $t->string('tax_id')->nullable();
                $t->string('email')->nullable(); $t->string('phone')->nullable();
                $t->text('address')->nullable(); $t->boolean('active')->default(true); $t->timestamps();
            });
        }
        Schema::create('branches', function (Blueprint $t) {
            $t->id(); $t->foreignId('customer_id')->constrained()->restrictOnDelete();
            $t->string('name'); $t->string('contact')->nullable();
            $t->text('billing_address')->nullable(); $t->text('shipping_address')->nullable();
            $t->boolean('active')->default(true); $t->timestamps();
        });
        foreach (['categories', 'units', 'payment_methods', 'price_lists'] as $table) {
            Schema::create($table, function (Blueprint $t) {
                $t->id(); $t->string('name')->unique(); $t->boolean('active')->default(true); $t->timestamps();
            });
        }
        Schema::create('taxes', function (Blueprint $t) {
            $t->id(); $t->string('name')->unique(); $t->decimal('rate', 5, 2);
            $t->boolean('active')->default(true); $t->timestamps();
        });
        Schema::create('items', function (Blueprint $t) {
            $t->id(); $t->string('sku')->unique(); $t->string('name'); $t->text('description')->nullable();
            $t->foreignId('category_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('unit_id')->constrained()->restrictOnDelete();
            $t->foreignId('tax_id')->nullable()->constrained('taxes')->restrictOnDelete();
            $t->decimal('purchase_price', 16, 2)->default(0); $t->decimal('sale_price', 16, 2)->default(0);
            $t->decimal('min_stock', 16, 3)->default(0); $t->string('barcode')->nullable();
            $t->boolean('active')->default(true); $t->timestamps();
        });
        Schema::create('prices', function (Blueprint $t) {
            $t->id(); $t->foreignId('item_id')->constrained()->restrictOnDelete();
            $t->foreignId('price_list_id')->constrained()->restrictOnDelete();
            $t->char('currency', 3); $t->decimal('price', 16, 2); $t->timestamps();
            $t->unique(['item_id', 'price_list_id', 'currency']);
        });
        Schema::create('stock_balances', function (Blueprint $t) {
            $t->id(); $t->foreignId('item_id')->constrained()->restrictOnDelete();
            $t->foreignId('location_id')->constrained()->restrictOnDelete();
            $t->decimal('quantity', 16, 3)->default(0); $t->timestamps();
            $t->unique(['item_id', 'location_id']);
        });
        Schema::create('sequences', function (Blueprint $t) { $t->string('name')->primary(); $t->unsignedBigInteger('value')->default(0); });
        Schema::create('documents', function (Blueprint $t) {
            $t->id(); $t->string('type')->index(); $t->string('number')->unique();
            $t->foreignId('parent_id')->nullable()->constrained('documents')->restrictOnDelete();
            $t->foreignId('customer_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('supplier_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('branch_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('location_id')->constrained()->restrictOnDelete();
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->string('status')->default('confirmed')->index(); $t->date('date')->index();
            $t->date('due_date')->nullable(); $t->char('currency', 3);
            $t->decimal('subtotal', 16, 2)->default(0); $t->decimal('tax_total', 16, 2)->default(0);
            $t->decimal('total', 16, 2)->default(0); $t->decimal('paid', 16, 2)->default(0);
            $t->text('notes')->nullable(); $t->json('party_snapshot');
            $t->timestamp('delivered_at')->nullable(); $t->text('cancellation_reason')->nullable(); $t->timestamps();
        });
        Schema::create('document_lines', function (Blueprint $t) {
            $t->id(); $t->foreignId('document_id')->constrained()->restrictOnDelete();
            $t->foreignId('parent_line_id')->nullable()->constrained('document_lines')->restrictOnDelete();
            $t->foreignId('item_id')->constrained()->restrictOnDelete(); $t->string('description');
            $t->decimal('quantity', 16, 3); $t->decimal('unit_price', 16, 2);
            $t->decimal('discount_percent', 5, 2)->default(0); $t->decimal('tax_percent', 5, 2)->default(0);
            $t->decimal('subtotal', 16, 2); $t->decimal('tax_total', 16, 2); $t->decimal('total', 16, 2);
            $t->unique(['document_id', 'item_id']);
        });
        Schema::create('stock_moves', function (Blueprint $t) {
            $t->id(); $t->uuid('operation_id')->index();
            $t->foreignId('item_id')->constrained()->restrictOnDelete();
            $t->foreignId('location_id')->constrained()->restrictOnDelete();
            $t->foreignId('document_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->string('type'); $t->decimal('quantity', 16, 3); $t->decimal('balance_after', 16, 3);
            $t->text('reason'); $t->timestamp('created_at');
        });
        Schema::create('payments', function (Blueprint $t) {
            $t->id(); $t->string('number')->unique(); $t->foreignId('invoice_id')->constrained('documents')->restrictOnDelete();
            $t->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->decimal('amount', 16, 2); $t->date('date'); $t->string('reference')->nullable();
            $t->string('status')->default('confirmed'); $t->text('cancellation_reason')->nullable(); $t->timestamps();
        });
        Schema::create('operations', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->constrained()->restrictOnDelete();
            $t->uuid('key'); $t->string('request_hash', 64); $t->json('result')->nullable(); $t->timestamps();
            $t->unique(['user_id', 'key']);
        });
        Schema::create('audit_events', function (Blueprint $t) {
            $t->id(); $t->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();
            $t->string('action'); $t->string('entity'); $t->unsignedBigInteger('entity_id')->nullable();
            $t->json('details'); $t->timestamp('created_at');
        });
        Schema::create('settings', function (Blueprint $t) { $t->string('key')->primary(); $t->json('value'); $t->timestamps(); });
    }

    public function down(): void
    {
        foreach (['settings', 'audit_events', 'operations', 'payments', 'stock_moves', 'document_lines', 'documents', 'sequences', 'stock_balances', 'prices', 'items', 'taxes', 'price_lists', 'payment_methods', 'units', 'categories', 'branches', 'locations', 'suppliers'] as $table) Schema::dropIfExists($table);
        Schema::table('users', function (Blueprint $t) { $t->dropConstrainedForeignId('customer_id'); $t->dropColumn(['role', 'active']); });
        Schema::dropIfExists('customers');
    }
};
