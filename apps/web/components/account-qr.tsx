"use client";

import Image from "next/image";
import { QrCodeIcon } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import type { BankAccount } from "@/lib/payments";

/**
 * Mobile entry point for the payment QR. The card is too narrow below xl to hold the
 * code inline, so the icon opens it in a dialog at a size that can actually be scanned.
 */
export function AccountQr({ account, qrImage, className }: { account: BankAccount; qrImage: string; className?: string }) {
  const label = `Código QR de la ${account.accountType.toLowerCase()} de ${account.bank}`;

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className={className} />}
        aria-label={`Ver ${label}`}
      >
        <QrCodeIcon aria-hidden />
        QR
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paga con el QR</DialogTitle>
          <DialogDescription>
            {account.bank} · {account.accountType} · {account.holder}
          </DialogDescription>
        </DialogHeader>
        <Image
          src={qrImage}
          alt={label}
          width={320}
          height={333}
          className="mx-auto w-full max-w-[320px] rounded-lg bg-white"
        />
        <p className="text-center text-xs text-muted-foreground">
          Escanea el código desde tu app bancaria, o guarda la imagen para escanearla desde otro
          dispositivo.
        </p>
      </DialogContent>
    </Dialog>
  );
}
