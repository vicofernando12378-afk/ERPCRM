<?php

namespace App\Mail;

use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CommercialDocument extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public int $tries = 3;

    public array $backoff = [30, 120, 600];

    public function __construct(public array $documentSnapshot, public array $companySnapshot, public string $mailSubject, public string $messageText) {}

    public function build(): static
    {
        $doc = $this->documentSnapshot;
        $company = $this->companySnapshot;
        $pdf = new Dompdf(new Options(['isRemoteEnabled' => false, 'isPhpEnabled' => false, 'defaultFont' => 'DejaVu Sans']));
        $pdf->loadHtml(view('documents.document', compact('doc', 'company'))->render());
        $pdf->setPaper('A4');
        $pdf->render();

        return $this->subject($this->mailSubject)->text('documents.email', ['messageText' => $this->messageText, 'company' => $company])->attachData($pdf->output(), $doc['number'].'.pdf', ['mime' => 'application/pdf']);
    }
}
