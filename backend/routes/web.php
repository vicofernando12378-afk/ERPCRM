<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\{SessionController, CatalogController, ErpController, AdminController, ReportController, DocumentOutputController, ImportController};
use App\Http\Middleware\ActiveUser;

Route::prefix('api/v1')->group(function () {
    Route::get('csrf', [SessionController::class, 'csrf']);
    Route::post('login', [SessionController::class, 'login'])->middleware('throttle:5,1');
    Route::post('forgot-password', [SessionController::class, 'forgot'])->middleware('throttle:3,1');
    Route::post('reset-password', [SessionController::class, 'reset'])->middleware('throttle:5,1');
    Route::middleware(ActiveUser::class)->group(function () {
        Route::get('me', [SessionController::class, 'me']);
        Route::post('logout', [SessionController::class, 'logout']);
        Route::post('password', [SessionController::class, 'password']);
        Route::get('catalog/{table}', [CatalogController::class, 'index']);
        Route::post('catalog/{table}', [CatalogController::class, 'save']);
        Route::put('catalog/{table}/{id}', [CatalogController::class, 'save']);
        Route::get('documents/type/{type}', [ErpController::class, 'list']);
        Route::post('documents/type/{type}', [ErpController::class, 'create']);
        Route::get('documents/{id}', [ErpController::class, 'detail']);
        Route::get('documents/{id}/pdf', [DocumentOutputController::class, 'pdf']);
        Route::post('documents/{id}/email', [DocumentOutputController::class, 'email'])->middleware('throttle:10,1');
        Route::get('payments/{id}/pdf', [DocumentOutputController::class, 'receipt']);
        Route::get('items/{id}/barcode', [DocumentOutputController::class, 'barcode']);
        Route::get('items/{id}/image', [DocumentOutputController::class, 'image']);
        Route::post('items/{id}/image', [DocumentOutputController::class, 'saveImage']);
        Route::post('documents/{id}/derive/{type}', [ErpController::class, 'derive']);
        Route::post('documents/{id}/pay', [ErpController::class, 'pay']);
        Route::post('documents/{id}/cancel', [ErpController::class, 'cancel']);
        Route::post('documents/{id}/deliver', [ErpController::class, 'deliver']);
        Route::get('payments', [ErpController::class, 'payments']);
        Route::post('payments/{id}/cancel', [ErpController::class, 'cancelPayment']);
        Route::get('stock', [ErpController::class, 'stock']);
        Route::get('stock/moves', [ErpController::class, 'moves']);
        Route::post('stock/adjust', [ErpController::class, 'adjust']);
        Route::post('stock/transfer', [ErpController::class, 'transfer']);
        Route::get('dashboard', [ReportController::class, 'dashboard']);
        Route::get('reports/sales', [ReportController::class, 'sales']);
        Route::get('reports/inventory', [ReportController::class, 'inventory']);
        Route::get('reports/export/{type}', [ReportController::class, 'export']);
        Route::get('settings', [AdminController::class, 'settings']);
        Route::put('settings', [AdminController::class, 'saveSettings']);
        Route::get('users', [AdminController::class, 'users']);
        Route::get('roles', [AdminController::class, 'roles']);
        Route::put('roles', [AdminController::class, 'saveRole']);
        Route::post('users', [AdminController::class, 'saveUser']);
        Route::put('users/{id}', [AdminController::class, 'saveUser']);
        Route::get('audit', [AdminController::class, 'audit']);
        Route::get('imports/{table}/template', [ImportController::class, 'template']);
        Route::post('imports/{table}', [ImportController::class, 'import']);
    });
});
Route::get('/', fn () => response()->json(['application' => 'ERP relacional', 'api' => '/api/v1', 'frontend' => 'http://127.0.0.1:3100']));
