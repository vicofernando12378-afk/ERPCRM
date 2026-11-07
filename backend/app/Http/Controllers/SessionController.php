<?php

namespace App\Http\Controllers;

use App\Domain\Access;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;

class SessionController extends Controller
{
    public function csrf() { return response()->json(['token' => csrf_token()]); }

    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        if (! Auth::attempt($data + ['active' => true])) throw ValidationException::withMessages(['email' => 'Correo o contraseña incorrectos.']);
        $request->session()->regenerate();
        return $this->me($request);
    }

    public function me(Request $request)
    {
        abort_unless($request->user()?->active, 401);
        $user = $request->user();
        return response()->json(['user' => $user, 'permissions' => Access::permissions($user), 'csrf_token' => csrf_token()]);
    }

    public function logout(Request $request)
    {
        Auth::logout(); $request->session()->invalidate(); $request->session()->regenerateToken();
        return response()->json(['success' => true]);
    }

    public function password(Request $request)
    {
        $data = $request->validate(['current_password' => 'required|current_password', 'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()]]);
        $request->user()->forceFill(['password' => Hash::make($data['password'])])->save();
        $request->session()->regenerate();
        return response()->json(['success' => true, 'csrf_token' => csrf_token()]);
    }

    public function forgot(Request $request)
    {
        $data = $request->validate(['email' => 'required|email']);
        PasswordBroker::sendResetLink($data + ['active' => true]);
        return response()->json(['message' => 'Si existe una cuenta activa, recibirás instrucciones para restablecer la contraseña.']);
    }

    public function reset(Request $request)
    {
        $data = $request->validate(['email' => 'required|email', 'token' => 'required|string', 'password' => ['required', 'confirmed', Password::min(12)->letters()->numbers()]]);
        $status = PasswordBroker::reset($data + ['active' => true], function ($user, $password) {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
            \Illuminate\Support\Facades\DB::table('sessions')->where('user_id', $user->id)->delete();
        });
        if ($status !== PasswordBroker::PASSWORD_RESET) throw ValidationException::withMessages(['email' => 'El enlace no es válido o ha caducado. Solicita uno nuevo.']);
        return response()->json(['message' => 'Contraseña restablecida. Ya puedes iniciar sesión.']);
    }
}
