import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { CuentaCobroOrden } from './cuenta-cobro-orden.entity.js';
import { Pago } from './pago.entity.js';
import { EnvioCuentaCobro } from './envio-cuenta-cobro.entity.js';
import { Orden } from '../pedidos/orden.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { CuentasCobroService } from './cuentas-cobro.service.js';
import { CuentasCobroController } from './cuentas-cobro.controller.js';
import { PdfCuentaCobroService } from './pdf-cuenta-cobro.service.js';
import { MailerCuentaCobroService } from './mailer-cuenta-cobro.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CuentaCobro,
      CuentaCobroOrden,
      Pago,
      EnvioCuentaCobro,
      Orden,
      Usuario,
    ]),
  ],
  providers: [CuentasCobroService, PdfCuentaCobroService, MailerCuentaCobroService],
  controllers: [CuentasCobroController],
})
export class CuentasCobroModule {}
