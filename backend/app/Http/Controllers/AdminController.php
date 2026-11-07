<?php

namespace App\Http\Controllers;

use App\Domain\{Access, Operations};
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Hash};
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class AdminController extends Controller
{
    public function settings(Request $r)
    {
        return json_decode(DB::table('settings')->where('key', 'company')->value('value') ?? '{}', true);
    }
    public function saveSettings(Request $r)
    {
        Access::require($r->user(), 'admin');
        $data = $r->validate(['name' => 'required|string|max:180', 'tax_id' => 'nullable|string|max:50', 'address' => 'nullable|string|max:2000', 'email' => 'nullable|email', 'phone' => 'nullable|string|max:50', 'currency' => 'required|in:PEN,USD,EUR']);
        return DB::transaction(function () use ($r, $data) {
            DB::table('settings')->updateOrInsert(['key' => 'company'], ['value' => json_encode($data), 'updated_at' => now(), 'created_at' => now()]);
            Operations::audit($r->user()->id, 'updated', 'settings', 0, $data);
            return $data;
        });
    }
    public function users(Request $r)
    {
        Access::require($r->user(), 'admin');
        return User::orderBy('id')->paginate(20);
    }
    public function saveUser(Request $r, ?int $id = null)
    {
        Access::require($r->user(), 'admin');
        $data = $r->validate(['name' => 'required|string|max:180', 'email' => ['required', 'email', Rule::unique('users')->ignore($id)], 'role' => ['required', 'exists:roles,slug'], 'active' => 'required|boolean', 'customer_id' => 'nullable|required_if:role,customer|exists:customers,id', 'password' => [$id ? 'nullable' : 'required', Password::min(12)->letters()->numbers()]]);
        abort_if($id === $r->user()->id && (! $data['active'] || $data['role'] !== 'admin'), 422, 'No puedes desactivar tu propio acceso administrativo.');
        $user = $id ? User::findOrFail($id) : new User;
        if (! empty($data['password'])) $data['password'] = Hash::make($data['password']); else unset($data['password']);
        if ($data['role'] !== 'customer') $data['customer_id'] = null;
        return DB::transaction(function () use ($r, $data, $user) {
            $user->forceFill($data)->save();
            Operations::audit($r->user()->id, 'saved', 'users', $user->id, array_diff_key($data, ['password' => true]));
            return $user;
        });
    }
    public function audit(Request $r)
    {
        Access::require($r->user(), 'admin');
        return DB::table('audit_events')->orderByDesc('id')->paginate(30);
    }

    public function roles(Request $r)
    {
        Access::require($r->user(), 'admin');
        return ['data' => DB::table('roles')->orderBy('id')->get()->map(fn ($role) => [...(array) $role, 'permissions' => json_decode($role->permissions, true)]), 'available' => Access::RIGHTS['manager']];
    }
    public function saveRole(Request $r)
    {
        Access::require($r->user(), 'admin');
        $data = $r->validate(['slug' => 'required|regex:/^[a-z][a-z0-9_-]{2,30}$/|not_in:admin,customer', 'name' => 'required|string|max:180', 'permissions' => 'present|array', 'permissions.*' => ['string', 'distinct', Rule::in(Access::RIGHTS['manager'])]]);
        return DB::transaction(function () use ($r, $data) {
            DB::table('roles')->updateOrInsert(['slug' => $data['slug']], ['name' => $data['name'], 'permissions' => json_encode($data['permissions']), 'updated_at' => now(), 'created_at' => now()]);
            Operations::audit($r->user()->id, 'saved', 'roles', (int) DB::table('roles')->where('slug', $data['slug'])->value('id'), $data);
            return ['success' => true];
        });
    }
}
