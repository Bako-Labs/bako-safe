import { createConfig } from 'fuels';

export default createConfig({
  output: './src/artifacts',
  scripts: ['./sway/script-example'],
  contracts: ['./sway/contract-example'],
});
