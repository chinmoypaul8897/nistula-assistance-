# eZee / YCS Connectivity API — Reference Mirror

> **Verbatim mirror** of `https://api.ezeetechnosys.com/` (the eZee Connectivity Portal / YCS Connectivity Portal), pulled **5 June 2026**.
> Content is reproduced as eZee published it — their wording, example payloads, currency signs and typos are left intact; nothing is "corrected" silently.
> **92 endpoints** across 8 categories. Companion Postman collection: `https://ezeenextgen.s3-us-west-2.amazonaws.com/download/eZeeLibrary/eZee%20Connectivity%20API.postman_collection.json`

## How to use this fileset

- Each endpoint has a **stable ID** (`CFG-01`, `BKG-31`, …) used nowhere by eZee — it's ours, so it won't move. eZee's own internal reference number is kept too, as **`eZee ref #NNN`** (their on-page cross-links use it).
- The docs are **split by category** (files below). For a task, load `00_INDEX.md` + only the category file(s) you need — the whole set is ~1 MB, too big to paste at once. `ezee_connectivity_api_FULL.md` is the everything-in-one-file version for grep/offline.
- To jump to an endpoint, search its **ID** (e.g. `BKG-02`) in the relevant file.
- The **Use-case → endpoint map** below is the fast path when building the website: find the job, get the IDs, open those blocks.

### Files

| File | Contents |
|------|----------|
| `00_INDEX.md` | This file — master index, base URLs, use-case map, notes |
| `01_overview_auth.md` | Intro, authentication, security, getting started, status codes, language codes |
| `02_configuration.md` | Configuration — 13 endpoints |
| `03_rates_and_availability.md` | Rates & Availability — 11 endpoints |
| `04_bookings.md` | Bookings — 32 endpoints |
| `05_housekeeping.md` | Housekeeping — 4 endpoints |
| `06_finance.md` | Finance — 11 endpoints |
| `07_ota_rms.md` | OTA / RMS — 9 endpoints |
| `08_fnb.md` | F&B — 7 endpoints |
| `09_others.md` | Others — 5 endpoints |
| `ezee_connectivity_api_FULL.md` | All of the above concatenated into one file |
| `_inventory.json` | Machine-readable index (id, name, request_type, method, endpoint, tags) |

### Base URLs in play

| Base endpoint | What it is | # endpoints |
|---------------|------------|:-----------:|
| `https://live.ipms247.com/pmsinterface/pms_connectivity.php` | Main PMS connectivity. JSON / POST. `HotelCode`+`AuthCode` in body, `Request_Type` keyword. | 22 |
| `https://live.ipms247.com/booking/reservation_api/listing.php` | Booking engine & meta-search. Query-param GET/POST, `APIKey`. Needs eZee Reservation. | 15 |
| `https://live.ipms247.com/index.php/page/service.kioskconnectivity` | Kiosk / self-service guest flow. JSON / POST. | 11 |
| `https://live.ipms247.com/index.php/page/service.PMSAccountAPI` | Finance / accounting, Xero-style. JSON / POST, `requestfor` keyword. | 8 |
| `https://live.ipms247.com/index.php/page/service.pos2pms` | POS ↔ PMS posting + hotel auth. XML / POST. | 6 |
| `https://live.ipms247.com/channelbookings/vacation_rental.php` | Vacation-rental module (villas). JSON / POST, `AUTH_CODE` header. | 5 |
| `https://live.ipms247.com/pmsinterface/getdataAPI.php` | Bulk retrieve — inventory / rates / historical bookings. XML / POST. | 3 |
| `https://live.ipms247.com/index.php/page/service.voucher` | Hotel expenses. JSON / POST. | 1 |
| `https://live.ipms247.com/index.php/page/service.posting` | Folio bills. JSON / POST. | 1 |
| `https://live.ipms247.com/index.php/page/service.hkinfoforkaterina` | Inhouse room status. JSON / POST. | 1 |
| `https://live.ipms247.com/index.php/page/service.hkupdatestatus` | Housekeeping status update. JSON / POST. | 1 |
| `https://live.ipms247.com/index.php/page/service.guestdatabase` | Guest-stays statistics. JSON / POST. | 1 |

### Notes / known eZee page quirks

- **Broken `End Point URL` hyperlinks:** on several blocks (much of Finance + Housekeeping) the *visible* URL is correct but the link's `href` wrongly points at `…/service.guestdatabase`. The mirror preserves the link as published; **trust the visible URL and the Base column / the `Endpoint:` line**, which use the correct one.
- The page's own examples contain typos (e.g. `IdentiyType`, `Saparatechannelsource`, `RegistrationNo` spacing). These are **left verbatim** — match them as-is when reading real responses.
- A few names repeat across eZee's own categories (e.g. `Retrieve Room Information`, `Retrieve Extras`); each is mirrored where it appears.
- **17 of 92** entries are narrative/flow descriptions (the OTA/RMS `Push*` model, F&B data objects, the Autosync overview, the API Authentication Guide) and have no single endpoint URL / `Request_Type` — content is captured in full regardless.

---

## Master index

### CFG — Configuration  ·  `02_configuration.md`  ·  13 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| CFG-01 | Check Hotel Authentication | `gethotelinfo` | POST | service.pos2pms | #478 |
| CFG-02 | Retrieve Room Information | `RoomInfo` | POST | pms_connectivity.php | #519 |
| CFG-03 | Retrieve Hotel Information | `HotelList` | GET | listing.php | #574 |
| CFG-04 | Retrieve Hotel Amenities | `HotelAmenity` | GET | listing.php | #582 |
| CFG-05 | Retrieve Room Types | `RoomTypeList` | GET | listing.php | #587 |
| CFG-06 | Retrieve Salutations and Country | `ConfiguredDetails` | GET | listing.php | #589 |
| CFG-07 | Retrieve Extras Rate Based on Parameters | `CalculateExtraCharge` | GET | listing.php | #594 |
| CFG-08 | Verify Travel Agent | `VerifyUser` | GET | listing.php | #596 |
| CFG-09 | Retrieve Payment Gateways | `ConfiguredPGList` | GET | listing.php | #613 |
| CFG-10 | Retrieve Currency | `RetrieveCurrency` | POST | service.kioskconnectivity | #2037 |
| CFG-11 | Retrieve Pay Methods | `RetrievePayMethods` | POST | service.kioskconnectivity | #2048 |
| CFG-12 | Retrieve Identity Type | `RetrieveIdentityType` | POST | service.kioskconnectivity | #2059 |
| CFG-13 | Retrieve Available Room List | `RoomAvailability` | POST | service.kioskconnectivity | #2336 |

### RA — Rates & Availability  ·  `03_rates_and_availability.md`  ·  11 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| RA-01 | Update Room Inventory | `UpdateAvailability` | POST | pms_connectivity.php | #620 |
| RA-02 | Update Linear Rate | `UpdateRoomRates` | POST | pms_connectivity.php | #626 |
| RA-03 | Update Non Linear Rate | `UpdateRoomRatesNL` | POST | pms_connectivity.php | #629 |
| RA-04 | Retrieve Room Rates with Source details | `Separatesourcemapping` | POST | pms_connectivity.php | #631 |
| RA-05 | Update Max Nights | `UpdateMaxNights` | POST | pms_connectivity.php | #633 |
| RA-06 | Update Min Nights | `UpdateMinNights` | POST | pms_connectivity.php | #637 |
| RA-07 | Update StopSell | `UpdateStopSell` | POST | pms_connectivity.php | #643 |
| RA-08 | Update Close On Arrival | `UpdateCOA` | POST | pms_connectivity.php | #650 |
| RA-09 | Update Close On Departure | `UpdateCOD` | POST | pms_connectivity.php | #654 |
| RA-10 | Retrieve Room Inventory | `Inventory` | POST | getdataAPI.php | #662 |
| RA-11 | Retrieve Room Rates | `Rate` | POST | getdataAPI.php | #667 |

### BKG — Bookings  ·  `04_bookings.md`  ·  32 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| BKG-01 | Check Availability | `RoomList` | GET | listing.php | #675 |
| BKG-02 | Retrieve all Bookings | `Bookings` | POST | pms_connectivity.php | #681 |
| BKG-03 | Retrieve a Booking | `FetchSingleBooking` | POST | pms_connectivity.php | #688 |
| BKG-04 | Booking Received Notification | `BookingRecdNotification` | POST | pms_connectivity.php | #692 |
| BKG-05 | Retrieve Arrivals | `ArrivalList` | POST | pms_connectivity.php | #695 |
| BKG-06 | Retrieve Departures | `DepartureList` | POST | pms_connectivity.php | #699 |
| BKG-07 | Post Charge To Room | `chargepost` | POST | service.pos2pms | #702 |
| BKG-08 | Void Charge on Room | `voidcharge` | POST | service.pos2pms | #707 |
| BKG-09 | Update POS Receipt No | `updatevoucherno` | POST | service.pos2pms | #710 |
| BKG-10 | Retrieve Post to Room Information | `roomlist` | POST | service.pos2pms | #712 |
| BKG-11 | Retrieve Post to Room Information for specific room | `roomquery` | POST | service.pos2pms | #715 |
| BKG-12 | Room Sales Data | `get_sales_report` | POST | vacation_rental.php | #719 |
| BKG-13 | Reserved Rooms Calendar | `get_calendar` | POST | vacation_rental.php | #732 |
| BKG-14 | Retrieve Physical Rooms | `get_rooms` | POST | vacation_rental.php | #737 |
| BKG-15 | Todays CheckIn-Checkout | `get_calendar` | POST | vacation_rental.php | #740 |
| BKG-16 | Reservation Details of a Room | `get_reservation` | POST | vacation_rental.php | #742 |
| BKG-17 | Pull Historical Bookings | `Booking` | POST | getdataAPI.php | #751 |
| BKG-18 | Post Create Bookings Actions | `ProcessBooking` | GET | listing.php | #762 |
| BKG-19 | Retrieve a Booking Based on Parameters | `BookingList` | GET | listing.php | #770 |
| BKG-20 | Read a Booking | `ReadBooking` | GET | listing.php | #774 |
| BKG-21 | Cancel a Booking | `CancelBooking` | GET | listing.php | #777 |
| BKG-22 | Autosync Future Bookings and its modifications | — | GET | — | #1533 |
| BKG-23 | Guest Data Update | `UploadDocument` | POST | pms_connectivity.php | #2064 |
| BKG-24 | Add Payment | `AddPayment` | POST | service.kioskconnectivity | #2104 |
| BKG-25 | Add Guest Profile to Bookings | `AddSharer` | POST | service.kioskconnectivity | #2151 |
| BKG-26 | Guest Check In | `GuestCheckIn` | POST | service.kioskconnectivity | #2172 |
| BKG-27 | Room Assignment | `AssignRoom` | POST | service.kioskconnectivity | #2197 |
| BKG-28 | Guest Check Out | `GuestCheckOut` | POST | service.kioskconnectivity | #2252 |
| BKG-29 | Retrieve List of Bills | `RetrieveListofBills` | POST | service.kioskconnectivity | #2274 |
| BKG-30 | Retrieve Transaction Details | `GetTransactionDetails` | POST | pms_connectivity.php | #2370 |
| BKG-31 | Create a Booking | `InsertBooking` | GET | listing.php | #2412 |
| BKG-32 | Add Extra Charge | `AddExtraCharge` | POST | service.kioskconnectivity | #2794 |

### HK — Housekeeping  ·  `05_housekeeping.md`  ·  4 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| HK-01 | Retrieve Inhouse Room Status | — | POST | service.hkinfoforkaterina | #786 |
| HK-02 | Update Room Status | — | POST | service.hkupdatestatus | #792 |
| HK-03 | Set out of Order (Block Room) | `SetoutofOrder` | POST | pms_connectivity.php | #797 |
| HK-04 | Unblock room | `UnblockRoom` | POST | pms_connectivity.php | #2012 |

### FIN — Finance  ·  `06_finance.md`  ·  11 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| FIN-01 | Retrieve Extras | `ExtraCharges` | — | listing.php | #592 |
| FIN-02 | Retrieve Hotel Expenses | — | POST | service.voucher | #802 |
| FIN-03 | Retrieve Bills | — | POST | service.posting | #805 |
| FIN-04 | Retrieve Financial Accounts | `XERO_GET_CONFIG_DATA` | POST | service.PMSAccountAPI | #1719 |
| FIN-05 | Retrieve Revenues | `XERO_GET_TRANSACTION_DATA` | POST | service.PMSAccountAPI | #1733 |
| FIN-06 | Retrieve Outwards Payments | `XERO_GET_PAYMENT_DATA` | POST | service.PMSAccountAPI | #1736 |
| FIN-07 | Retrieve Inwards Payments | `XERO_GET_RECEIPT_DATA` | POST | service.PMSAccountAPI | #1738 |
| FIN-08 | Retrieve Journals | `XERO_GENERAL_JOURNAL_INFO` | POST | service.PMSAccountAPI | #1741 |
| FIN-09 | Retrieve Incidental Invoices | `XERO_INCIDENTAL_INVOICE` | POST | service.PMSAccountAPI | #1743 |
| FIN-10 | Retrieve Outwards Folio wise Payments | `XERO_GET_PAYMENT_DATA_FOLIOUNKID` | POST | service.PMSAccountAPI | #2783 |
| FIN-11 | Retrieve Inwards Folio wise Payments | `XERO_GET_RECEIPT_DATA_FOLIOUNKID` | POST | service.PMSAccountAPI | #2787 |

### OTA — OTA / RMS  ·  `07_ota_rms.md`  ·  9 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| OTA-01 | Request Room Information | — | POST | — | #1820 |
| OTA-02 | Push Inventory | — | POST | — | #1830 |
| OTA-03 | Push Linear Rates (Room Base Rates) | — | POST | — | #1833 |
| OTA-04 | Push Non-Linear Rates (Occupancy Base rates) | — | POST | — | #1836 |
| OTA-05 | Push Minimum Nights | — | POST | — | #1839 |
| OTA-06 | Push Stop Sell | — | POST | — | #1843 |
| OTA-07 | Push Close On Arrival | — | POST | — | #1848 |
| OTA-08 | Push Close on Departure | — | POST | — | #1857 |
| OTA-09 | Get Bookings to YCS | — | POST | — | #1860 |

### FNB — F&B  ·  `08_fnb.md`  ·  7 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| FNB-01 | Menu | — | — | — | #2653 |
| FNB-02 | Orders | — | — | — | #2686 |
| FNB-03 | Outlet and Store Information [F&B] | — | — | — | #2748 |
| FNB-04 | Financial Accounts [F&B] | — | — | — | #2708 |
| FNB-05 | Sales [F&B] | — | — | — | #2720 |
| FNB-06 | Purchases [F&B] | — | — | — | #2759 |
| FNB-07 | API Authentication Guide | — | POST | — | #2822 |

### OTH — Others  ·  `09_others.md`  ·  5 endpoints

| ID | Endpoint | Request_Type | Method | Base | eZee ref |
|----|----------|--------------|:------:|------|:--------:|
| OTH-01 | Retrieve Guest Stays Statistics | — | POST | service.guestdatabase | #808 |
| OTH-02 | Retrieve a Company | `CompanyList` | POST | pms_connectivity.php | #811 |
| OTH-03 | Retrieve A Travel Agent | `TravelAgentList` | POST | pms_connectivity.php | #814 |
| OTH-04 | Create a Travel Agent | `InsertTravelAgent` | GET | listing.php | #818 |
| OTH-05 | Retrieve Guest | `GuestList` | POST | pms_connectivity.php | #1200 |

---

## Use-case → endpoint map (for building the site)

**1. Show live availability + prices on a page**  
&nbsp;&nbsp;&nbsp;`BKG-01` Check Availability  
&nbsp;&nbsp;&nbsp;_The single call that backs a booking widget — returns rooms, rate plans, per-night rates, taxes, min-nights and inventory for a date range._

**2. Plain room-availability calendar (no pricing)**  
&nbsp;&nbsp;&nbsp;`CFG-13` Retrieve Available Room List  ·  `BKG-13` Reserved Rooms Calendar  ·  `BKG-15` Todays CheckIn-Checkout  
&nbsp;&nbsp;&nbsp;_Lighter than Check Availability when you only need which rooms are free._

**3. Pull property content (rooms / plans / amenities)**  
&nbsp;&nbsp;&nbsp;`CFG-02` Retrieve Room Information  ·  `CFG-05` Retrieve Room Types  ·  `CFG-04` Retrieve Hotel Amenities  ·  `CFG-06` Retrieve Salutations and Country  ·  `CFG-03` Retrieve Hotel Information  
&nbsp;&nbsp;&nbsp;_Master data for mapping + display._

**4. Push rates / inventory / restrictions (only if you manage pricing)**  
&nbsp;&nbsp;&nbsp;`RA-01` Update Room Inventory  ·  `RA-02` Update Linear Rate  ·  `RA-03` Update Non Linear Rate  ·  `RA-05` Update Max Nights  ·  `RA-06` Update Min Nights  ·  `RA-07` Update StopSell  ·  `RA-08` Update Close On Arrival  ·  `RA-09` Update Close On Departure  
&nbsp;&nbsp;&nbsp;_Read back with `RA-10` Retrieve Room Inventory / `RA-11` Retrieve Room Rates._

**5. Create & manage a booking from the site**  
&nbsp;&nbsp;&nbsp;`BKG-31` Create a Booking  ·  `BKG-18` Post Create Bookings Actions  ·  `BKG-20` Read a Booking  ·  `BKG-19` Retrieve a Booking Based on Parameters  ·  `BKG-21` Cancel a Booking  
&nbsp;&nbsp;&nbsp;_InsertBooking creates → ProcessBooking confirms/allocates → then read / cancel._

**6. Keep your DB in sync with ALL bookings (direct + OTA)**  
&nbsp;&nbsp;&nbsp;`BKG-02` Retrieve all Bookings  ·  `BKG-04` Booking Received Notification  ·  `BKG-05` Retrieve Arrivals  ·  `BKG-06` Retrieve Departures  
&nbsp;&nbsp;&nbsp;_Poll Retrieve all Bookings ~every minute, then acknowledge with Booking Received Notification._

**7. Self-service / kiosk guest flow**  
&nbsp;&nbsp;&nbsp;`BKG-26` Guest Check In  ·  `BKG-28` Guest Check Out  ·  `BKG-27` Room Assignment  ·  `BKG-24` Add Payment  ·  `BKG-25` Add Guest Profile to Bookings  ·  `BKG-23` Guest Data Update  ·  `BKG-29` Retrieve List of Bills  

**8. Vacation-rental / villa specifics**  
&nbsp;&nbsp;&nbsp;`BKG-16` Reservation Details of a Room  ·  `BKG-14` Retrieve Physical Rooms  ·  `BKG-13` Reserved Rooms Calendar  ·  `BKG-12` Room Sales Data  ·  `BKG-15` Todays CheckIn-Checkout  
&nbsp;&nbsp;&nbsp;_All on `channelbookings/vacation_rental.php` (AUTH_CODE header) — the villa-oriented module._

**9. Owner P&L / accounting feed (per-property books)**  
&nbsp;&nbsp;&nbsp;`FIN-05` Retrieve Revenues  ·  `FIN-07` Retrieve Inwards Payments  ·  `FIN-06` Retrieve Outwards Payments  ·  `FIN-08` Retrieve Journals  ·  `FIN-09` Retrieve Incidental Invoices  ·  `FIN-04` Retrieve Financial Accounts  ·  `FIN-02` Retrieve Hotel Expenses  ·  `FIN-03` Retrieve Bills  ·  `FIN-11` Retrieve Inwards Folio wise Payments  ·  `FIN-10` Retrieve Outwards Folio wise Payments  
&nbsp;&nbsp;&nbsp;_Xero-style pulls — the backbone for automating owner statements._

**10. Housekeeping status board**  
&nbsp;&nbsp;&nbsp;`HK-01` Retrieve Inhouse Room Status  ·  `HK-02` Update Room Status  ·  `HK-03` Set out of Order (Block Room)  ·  `HK-04` Unblock room  

**11. Channel / OTA push model (reference / context)**  
&nbsp;&nbsp;&nbsp;`OTA-01` Request Room Information  ·  `OTA-02` Push Inventory  ·  `OTA-03` Push Linear Rates (Room Base Rates)  ·  `OTA-04` Push Non-Linear Rates (Occupancy Base rates)  ·  `OTA-05` Push Minimum Nights  ·  `OTA-06` Push Stop Sell  ·  `OTA-07` Push Close On Arrival  ·  `OTA-08` Push Close on Departure  ·  `OTA-09` Get Bookings to YCS  
&nbsp;&nbsp;&nbsp;_Narrative of how a channel manager syncs into YCS — maps largely onto the Rates & Availability + Bookings calls above._
