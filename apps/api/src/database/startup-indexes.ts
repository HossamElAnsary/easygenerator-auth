import { Injectable } from '@nestjs/common';

@Injectable()
export class StartupIndexes {
  async verify(): Promise<void> {
    // M2 adds non-destructive user/session index creation and verification here.
    // The startup gate already awaits this hook before accepting traffic.
  }
}
