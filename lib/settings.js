// Switch what customers can see. Owners always see every price in the owner portal.
// Set any of these to true to show prices again.
export const SHOW_PRICES = {
  home: true,           // owner-set service prices on the home page (by the customer’s vehicle type)
  plans: false,         // plan prices on /plans
  estimate: false,      // price range after a customer describes the problem on /book
  customerBills: false, // amounts on the customer's tracker, vehicle history and bills
};

// Phone numbers typed without a country code get this prefix (for OTP SMS).
export const DEFAULT_COUNTRY_CODE = "+91";
