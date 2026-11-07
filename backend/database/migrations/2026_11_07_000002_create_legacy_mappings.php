<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('legacy_mappings', function (Blueprint $t) {
            $t->id(); $t->string('source', 64); $t->string('source_table', 64); $t->string('legacy_id', 100);
            $t->string('target_table', 64); $t->unsignedBigInteger('target_id'); $t->timestamps();
            $t->unique(['source', 'source_table', 'legacy_id']);
        });
    }
    public function down(): void { Schema::dropIfExists('legacy_mappings'); }
};
