import { bootstrap } from "./main";
import { bootstrapWorker } from "./worker";
const isWorkerMode = process.env.MODE === 'WORKER';

if (isWorkerMode) {
  bootstrapWorker()
} else {
  bootstrap();
}
