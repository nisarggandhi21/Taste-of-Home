// Preload that swaps third-party services for the local fakes, for running a script
// outside the test runner:
//
//   node --import ./test/support/register-fakes.js <script>
import { register } from 'node:module';

register('./stripe-hooks.js', import.meta.url);
