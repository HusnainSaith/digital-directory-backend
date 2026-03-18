import { Global, Module } from '@nestjs/common';
import { R2StorageService } from '../services/r2-storage.service';
import { InvoiceService } from '../services/invoice.service';

@Global()
@Module({
  providers: [R2StorageService, InvoiceService],
  exports: [R2StorageService, InvoiceService],
})
export class StorageModule {}
