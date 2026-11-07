<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ActiveUser
{
    public function handle(Request $request, Closure $next)
    {
        abort_unless($request->user()?->active, 401, 'Inicia sesión para continuar.');
        return $next($request);
    }
}
