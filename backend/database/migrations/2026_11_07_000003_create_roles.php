<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\{DB, Schema};

return new class extends Migration {
    public function up(): void {
        Schema::create('roles', function (Blueprint $t) { $t->id(); $t->string('slug')->unique(); $t->string('name'); $t->json('permissions'); $t->timestamps(); });
        foreach (['admin' => ['*'], ...\App\Domain\Access::RIGHTS] as $slug => $permissions) DB::table('roles')->insert(['slug' => $slug, 'name' => ucfirst($slug), 'permissions' => json_encode($permissions), 'created_at' => now(), 'updated_at' => now()]);
    }
    public function down(): void { Schema::dropIfExists('roles'); }
};
