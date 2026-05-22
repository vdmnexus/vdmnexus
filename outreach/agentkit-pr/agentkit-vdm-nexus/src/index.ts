/**
 * Public exports for `@coinbase/agentkit-vdm-nexus`.
 */

export {
  VdmNexusActionProvider,
  vdmNexusActionProvider,
  type VdmNexusActionProviderConfig,
} from "./nexus-action-provider.js";

export {
  NexusChatSchema,
  type NexusChatResult,
} from "./actions/nexus-chat.js";

export { NexusVerifyReceiptSchema } from "./actions/nexus-verify-receipt.js";

export {
  NexusGetDepositAddressSchema,
  type NexusDepositAddressResponse,
} from "./actions/nexus-get-deposit-address.js";
