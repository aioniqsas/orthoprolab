import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaCobro } from './cuenta-cobro.entity.js';
import { CuentaCobroOrden } from './cuenta-cobro-orden.entity.js';
import { Pago } from './pago.entity.js';
import { EnvioCuentaCobro } from './envio-cuenta-cobro.entity.js';
import { MetodoPagoBancario } from './metodo-pago-bancario.entity.js';
import { Orden } from '../pedidos/orden.entity.js';
import { Usuario } from '../usuarios/usuario.entity.js';
import { CuentasCobroService } from './cuentas-cobro.service.js';
import { CuentasCobroController } from './cuentas-cobro.controller.js';
import { CuentasCobroEventosService } from './cuentas-cobro-eventos.service.js';
import { PdfCuentaCobroService } from './pdf-cuenta-cobro.service.js';
import { MailerCuentaCobroService } from './mailer-cuenta-cobro.service.js';
import { ComprobanteStorageService } from './comprobante-storage.service.js';
import { ComprobanteUploadInterceptor } from './comprobante-upload.interceptor.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CuentaCobro,
      CuentaCobroOrden,
      Pago,
      EnvioCuentaCobro,
      MetodoPagoBancario,
      Orden,
      Usuario,
    ]),
  ],
  providers: [
    CuentasCobroService,
    CuentasCobroEventosService,
    PdfCuentaCobroService,
    MailerCuentaCobroService,
    ComprobanteStorageService,
    ComprobanteUploadInterceptor,
  ],
  controllers: [CuentasCobroController],
  exports: [
    CuentasCobroService,
    CuentasCobroEventosService,
    ComprobanteUploadInterceptor,
  ],
})
export class CuentasCobroModule {}
