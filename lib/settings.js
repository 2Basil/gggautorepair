// Switch what customers can see. Owners always see every price in the owner portal.
// Set any of these to true to show prices again.
export const SHOW_PRICES = {
  home: true,           // owner-set service prices on the home page (by the customer’s vehicle type)
  plans: false,         // plan prices on /plans
  estimate: false,      // price range after a customer describes the problem on /book
  customerBills: true, // amounts on the customer's tracker, vehicle history and bills
};

// Registration verification (email code). false = paused: customers register without any code.
// Turn on by setting REQUIRE_VERIFICATION=true in Vercel env (needs the EMAIL_* variables for the code email).
export const REQUIRE_VERIFICATION = process.env.REQUIRE_VERIFICATION === "true";

// Phone numbers typed without a country code get this prefix (for OTP SMS).
export const DEFAULT_COUNTRY_CODE = "+1";
