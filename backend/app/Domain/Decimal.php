<?php

namespace App\Domain;

use Illuminate\Validation\ValidationException;

final class Decimal
{
    public static function units(string|int|float $value, int $scale = 2): int
    {
        $s = (string) $value;
        if (! preg_match('/^-?\d{1,9}(?:\.\d{1,'.$scale.'})?$/', $s)) {
            throw ValidationException::withMessages(['amount' => 'Número decimal inválido o con demasiados decimales.']);
        }
        $negative = str_starts_with($s, '-');
        [$whole, $part] = array_pad(explode('.', ltrim($s, '-')), 2, '');
        $result = (int) $whole * (10 ** $scale) + (int) str_pad($part, $scale, '0');
        return $negative ? -$result : $result;
    }

    public static function text(int $value, int $scale = 2): string
    {
        return ($value < 0 ? '-' : '').intdiv(abs($value), 10 ** $scale).'.'.str_pad((string) (abs($value) % (10 ** $scale)), $scale, '0', STR_PAD_LEFT);
    }

    public static function line(array $line): array
    {
        $qty = self::units($line['quantity'], 3);
        $price = self::units($line['unit_price']);
        $discount = self::units($line['discount_percent'] ?? 0);
        $tax = self::units($line['tax_percent'] ?? 0);
        $base = intdiv($qty * $price + 500, 1000);
        $net = $base - intdiv($base * $discount + 5000, 10000);
        $taxTotal = intdiv($net * $tax + 5000, 10000);
        return ['subtotal' => self::text($net), 'tax_total' => self::text($taxTotal), 'total' => self::text($net + $taxTotal)];
    }
}
