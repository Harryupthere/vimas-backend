// reward_mall_purchase_status is otherwise fully admin-configured data (no
// other status meaning is baked into the schema or code), but id 2 is
// specifically reserved as "Accepted" by convention on the live table. Two
// places need this:
//  - RewardMallPurchasesService.update: triggers receipt generation the
//    moment admin sets statusId to this value.
//  - RewardMallReceiptsService.requestGeneration: only lets the buyer
//    (re)request generation while the purchase currently sits at this
//    status — e.g. after a queue failure.
// Kept in one shared place so the two modules (which don't otherwise
// depend on each other) never drift out of sync on what "accepted" means.
export const ACCEPTED_REWARD_MALL_PURCHASE_STATUS_ID = 2;
