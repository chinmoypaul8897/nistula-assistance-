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



<!-- ====================================================================== -->


# Overview, Authentication & Reference

> Global sections of the eZee / YCS Connectivity API, verbatim from api.ezeetechnosys.com (pulled 5 June 2026). Base URLs, auth model, status codes, language codes.

## Introduction

The API allows you to perform all the operations that you do with our web client.

API is built using REST principles which ensures predictable URLs that makes writing applications easy. Our API has predictable, resource-oriented URLs, and uses response codes to indicate API errors.  This API follows HTTP rules, enabling a wide range of HTTP clients can be used to interact with the API. 

We support cross-origin resource sharing, allowing you to interact securely with our API from a client-side web application (though you should never expose your secret API key in any public website’s client-side code). Our API’s nature are different and so are their responses which support XML, JSON and CSV response formats.

To make the API as explorable as possible, we offer separate environment testing for sandbox accounts and live accounts differentiated by hotel codes and API keys.

---

## About the YCS Connectivity API

The APIs enable Connectivity Partners to send and retrieve data for the properties. They can easily manage [rates and availability](https://api.ezeetechnosys.com/#section-rates-availability), [bookings](https://api.ezeetechnosys.com/#section-bookings), [housekeepings](https://api.ezeetechnosys.com/#section-housekeeping), and many other things — all using their own systems. This enables them to build a “one-stop store” for their connected properties, allowing property owners to easily manage their information on numerous applications. You can download ready [postman collection](https://ezeenextgen.s3-us-west-2.amazonaws.com/download/eZeeLibrary/eZee%20Connectivity%20API.postman_collection.json) for test our APIs.

---

## Getting Started

### **Tutorial : Registration – Get a sandbox property**

In this tutorial, you’ll learn how to use YCS Connectivity API with sandbox property and you are at the stage “Ready to Test”. “Ready to Test” means that the property has enough content to pass our automated checks.

### This is for whom?

1.  A developer who works for a company that wants to communicate between YCS Cloud Applications and external applications or systems.
2.  A developer who works for other cloud services that work with data of properties in YCS (e.g. revenue management systems, cloud POS systems)
3.  It can also be used by applications that are running on site at the property and can mediate communication between YCS and local devices (e.g. POS systems, printers and other physical devices, kiosks etc).

### Before you start using API’s

You will need this to complete tutorial :

|                                                                      |                                                                                                                                                                                                                                           |
|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Description**                                                      | **Notes**                                                                                                                                                                                                                                 |
| A **sandbox account** with correct permission                        | To request for sandbox property, please fill up this [Registration Form](https://api.ezeetechnosys.com/registration/). To get the right permissions, speak to your account manager or [contact us](mailto:integration@ezeetechnosys.com). |
| An understanding of our **authentication** and **security** methods. | Your requests will not work unless you use the correct [headers](https://api.ezeetechnosys.com/#authentication) and [protocols](https://api.ezeetechnosys.com/#security).                                                                 |

### **Trial Period**

In this tutorial, you’ll be using our YCS Connectivity API with sandbox property and you are at the stage “About to Expire”. “About to Expire” means that the property would not be allowed to use our API’s after some point in time.

### Expire Trial Period

Now, you have a sandbox account available with you, we will allow you to use this sandbox account only till 30 days. After 30 days, it will be expired and you will not be able to use our API’s.

### Trial Period Extension

You will need this to complete tutorial :

|                                             |                                                                                                                                                                                                                                                      |
|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Description**                             | **Notes**                                                                                                                                                                                                                                            |
| A **sandbox account** with extension period | To request a sandbox extension, please fill up this [Extension Form](https://api.ezeetechnosys.com/extend-openapi-trial-period/). To get the right permissions, speak to your account manager or [contact us](mailto:integration@ezeetechnosys.com). |

### This is for whom?

1.  A developer who works for a company that wants to communicate between YCS Cloud Applications and external applications or systems – is not able to complete their study or development in a given sandbox period.
2.  A developer who works for other cloud services that work with data of properties in YCS (e.g. revenue management systems, cloud POS systems) – is not able to complete their study or development in a given sandbox period.

### **Test API**

Find out if your property passes our checks. Use this method and URL to run the checks on your property:

### Sample Request

Out of the requested API’s you can try any one of the API to check its behaviour. Here’s one sample :

### Sample Response

A response may contain success or error:

### What if I get an error?

Nature of API’s on this platform are different and so are their errors. So you need to focus more on messages you get in errors.

Most of the time, it should finish in the time you can drink a cup of coffee, but can sometimes take longer.

Try again after a while. If the problem doesn’t go away after several hours, ask your account manager for help or you can even [contact us](mailto:integration@ezeetechnosys.com).

### **Push API**

A push API is used to send data from an application server to a web application. The push service delivers the message to a specific user agent, identifying the push endpoint in the message.

### Specification

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Description</strong></td>
<td><strong>Notes</strong></td>
</tr>
<tr class="even">
<td>Provide us endpoint<br />
URL</td>
<td>To start using our push API – for getting bookings, you need to provide us your endpoint URL.</td>
</tr>
</tbody>
</table>

### This is for whom?

For a revenue management company who is looking for an auto syncing facility of bookings and its modifications on a timely basis.

### **Epilogue – what’s next?**

Till now this was a test run. You have taken your property as far as you can take it. More importantly, you now understand the basics of using the YCS Connectivity APIs.

You are all done testing our API’s with sandbox properties and now it’s time to go live. You would then need to get live property from YCS by writing us [here](mailto:integration@ezeetechnosys.com). Our support agent will be helping you to get live property and API setups,  and finally we would be making some final checks on our side to assure connectivity works well.

Consider doing these things next:

Check your requested API’s with the production environment.

Read about the other API modules, such as [Rates & Availability](https://api.ezeetechnosys.com/#section-rates-availability), [Bookings](https://api.ezeetechnosys.com/#section-bookings), and [House Keepings](https://api.ezeetechnosys.com/#section-housekeeping).

Build a simple feature in your own software that uses the API to push availability to YCS.

If you intend to become a certified Connectivity Partner, your account manager can tell you what steps to take next.

---

## API Rate Limits

To stop extravagant load on our systems, we limit the number of API calls that a user can make per auth key before the API returns HTTP/1.1 429 Too Many Requests.

YCS reserves the right to 

1.  Change these limits at any time, without prior notice and  
    impose other limits on specific accounts.

|                 |                               |                                                      |                                                  |
|-----------------|-------------------------------|------------------------------------------------------|--------------------------------------------------|
| **Granularity** | **Max. request per Auth Key** | **Max. Request per Auth Key with specific Endpoint** | **Max. Request per Auth Key with mix Endpoints** |
| 5 second        | 5                             | 3                                                    | 3                                                |
| 1 Minute        | 60                            | 25                                                   | 36                                               |
| 1 hour          | 3,600                         | 1,500                                                | 2,160                                            |
| 1 day           | 86,400                        | 36,000                                               | 51,840                                           |

**Note:** Each request should not exceed 30 days.

Here are the API endpoints :

|                                           |
|-------------------------------------------|
| **API Endpoints**                         |
| /pmsinterface/pms_connectivity.php        |
| /index.php/page/service.guestdatabase     |
| /index.php/page/service.voucher           |
| /index.php/page/service.posting           |
| /index.php/page/service.hkinfoforkaterina |
| /index.php/page/service.hkupdatestatus    |
| /channelbookings/vacation_rental.php      |
| /index.php/page/service.pos2pms           |
| /booking/reservation_api/listing.php      |
| /pmsinterface/getdataAPI.php              |
| /index.php/page/service.PMSAccountAPI     |
| /index.php/page/service.kioskconnectivity |

If your application exceeds our rate limit, consider the following suggestions : 

1.  Optimize your code to eliminate any unnecessary API calls.
2.  Cache frequently used data.
3.  Use bulk and batch endpoints such as Update Many Request, which lets you update up to 100 request with a single API request (avoid calling API in loops for single date update and try to make effective use of grouping data)
4.  Implement a two-second delay after every 5 requests.
5.  Implement a queuing system.

---

## Authentication

### Header Information

Please ensure that every API request includes the **User-Agent** header in the following format: **`openAPI-{vendorname/propertyname}`**.  
For example: **`User-Agent: openAPI-SampleHotel`**.

### Sandbox Account

You need a sandbox account to use the YCS Connectivity API platform. [Register here](https://api.ezeetechnosys.com/registration/) for getting sandbox account.

### Production Account

You need a production account to use the YCS Connectivity API platform. [Contact us](mailto:integration@ezeetechnosys.com) to get production account information.

### Basic Authentication Scheme

YCS Connectivity APIs use the basic HTTP authentication scheme – which are understood by ready-made HTTP clients. 

To use our API you must satisfy these prerequisites

1.  A valid hotel code.
2.  An Authentication Token

### Authentication Failure

The API returns failed authentication attempts. The response body will be different as per nature of API.

``` json
{
     "Errors": {
         "ErrorCode": "602",
         "ErrorMessage": "Error: Invalid Auth Code. Please enter proper Auth Code."
     }
}
```

``` json
{
    "Errors": {
        "ErrorCode": "611",
        "ErrorMessage": "Unauthorized Access: Invalid Auth Code or Hotel Code."
     }
 }
```

``` json
{
    "Errors": {
        "ErrorCode": "614",
        "ErrorMessage": "Sandbox User Trial Period is expired. So, you can't access it."
    }
}
```

``` json
 {
    "Errors": {
        "ErrorCode": "612",
        "ErrorMessage": "Sandbox User Auth Code is inactive."
    }
 }
```

### Troubleshooting

If your requests repeatedly fail authentication, check below concerns:

1.  Your request includes a proper Authorization header.
2.  Your sandbox account credentials are correct.
3.  You have access to the endpoint you’re calling.

[Contact us](mailto:integration@ezeetechnosys.com) in case of queries.

---

## Security

All requests to the API must use the HTTPS protocol (Hypertext Transfer Protocol \[HTTP/1.1\], over Transport Layer Security \[TLS 1.2\]. This ensures the proper encryption of sandbox account credentials.

---

## Status Codes

|                     |                              |
|---------------------|------------------------------|
| **Status** **Code** | **Status** **Name**          |
| 1                   | Arrival                      |
| 2                   | Check Out                    |
| 3                   | About to check out (Due Out) |
| 4                   | Confirmed Reservation        |
| 5                   | Void                         |
| 6                   | Cancel                       |
| 7                   | No Show                      |
| 8                   | Maintenance Block            |
| 10                  | Unconfirmed Reservation      |
| 11                  | Stayover                     |
| 12                  | Unblock                      |
| 13                  | Dayuse Reservation           |
| 14                  | Dayuse                       |

---

## Language Codes

In some of the API’s, we do ask for language codes. So this is basically language packs you have taken for your Booking Engine and you request to get data specific to your language so here are those codes listed which you can pass in the API.

|                   |                     |
|-------------------|---------------------|
| **Language Code** | **Language**        |
| af                | Afrikaans           |
| sq                | Albanian            |
| ar                | Arabic              |
| eu                | Basque              |
| be                | Belarusian          |
| bg                | Bulgarian           |
| ca                | Catalan             |
| zh-CN             | Chinese             |
| zh-TW             | Chinese Traditional |
| hr                | Croatian            |
| cs                | Czech               |
| da                | Danish              |
| nl                | Dutch               |
| en                | English             |
| et                | Estonian            |
| tl                | Filipino            |
| fi                | Finnish             |
| fr                | French              |
| gl                | Galician            |
| de                | German              |
| el                | Greek               |
| ht                | Haitian Creole      |
| iw                | Hebrew              |
| hi                | Hindi               |
| hu                | Hungarian           |
| is                | Icelandic           |
| id                | Indonesian          |
| ga                | Irish               |
| it                | Italian             |
| ja                | Japanese            |
| lv                | Latvian             |
| lt                | Lithuanian          |
| mk                | Macedonian          |
| ms                | Malay               |
| mt                | Maltese             |
| fa                | Persian             |
| pl                | Polish              |
| pt                | Portuguese          |
| ro                | Romanian            |
| ru                | Russian             |
| sr                | Serbian             |
| sk                | Slovak              |
| sles              | SlovenianSpanish    |
| sw                | Swahili             |
| sv                | Swedish             |
| th                | Thai                |
| tr                | Turkish             |
| uk                | Ukrainian           |
| vi                | Vietnamese          |
| cy                | Welsh               |
| yi                | Yiddish             |
| ko                | Korean              |

---

## Disclaimer

All information contained in this document is subject to the terms and conditions of your contractual agreement with YCS.

------------------------------------------------------------------------



<!-- ====================================================================== -->


# Configuration

> eZee / YCS Connectivity API — `CFG` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

These are basically masters data that many connectivity partners ask for to do mappings with their system. Most of the API’s work as a web service which uses the HTTP protocol.

**13 endpoints in this file:** CFG-01 Check Hotel Authentication, CFG-02 Retrieve Room Information, CFG-03 Retrieve Hotel Information, CFG-04 Retrieve Hotel Amenities, CFG-05 Retrieve Room Types, CFG-06 Retrieve Salutations and Country, CFG-07 Retrieve Extras Rate Based on Parameters, CFG-08 Verify Travel Agent, CFG-09 Retrieve Payment Gateways, CFG-10 Retrieve Currency, CFG-11 Retrieve Pay Methods, CFG-12 Retrieve Identity Type, CFG-13 Retrieve Available Room List

---

### CFG-01 · Check Hotel Authentication

**Request\_Type:** `gethotelinfo`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.pos2pms`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #478

*Tags: POS Connectivity*

This API checks authentication and returns hotel information if authentication is valid. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.pos2pms>

**Header**

Content-Type: application/xml

#### **Parameter**

|          |               |                            |                   |
|----------|---------------|----------------------------|-------------------|
| **Name** | **Data Type** | **Description **           | **Example**       |
| auth \*  | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| oprn \*  | VARCHAR(150)  | Use Keyword “gethotelinfo” |                   |

**Request **

``` xml
<?xml version="1.0" standalone="yes"?>
<request>
     <auth>xxxxxxxxxxxxxxxxxxxxxxxxxxxxx</auth>
     <oprn>gethotelinfo</oprn>
</request>
```

**Response**

|           |               |                                                                 |             |
|-----------|---------------|-----------------------------------------------------------------|-------------|
| **Name**  | **Data Type** | **Description **                                                | **Example** |
| status    | String        | Status value will be providedValues: ok, error                  | ok          |
| msg       | String        | Message result will be providedValues: success or error message | success     |
| hotelname | String        | Name of Hotel                                                   | Hotel       |
| hotelcode | Integer       | ID of Room                                                      | xxxx        |

**Success**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>ok</status>
    <msg>success</msg>
    <hotelname>Mega Hills Hotel</hotelname>
    <hotelcode>xxxx</hotelcode>
</response> 
```

**Error**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>error</status>
    <msg>Invalid Authentication</msg>
</response>
```

**Error Codes**

|                                                 |                                       |
|-------------------------------------------------|---------------------------------------|
| **Errors**                                      | **Description**                       |
| Hotel Code In-Active                            | The Property has been deactivated     |
| API Authkey is deactivated                      | The Authcode/Key has been deactivated |
| Invalid Authentication                          | Invalid data                          |
| Bad Request                                     | Invalid Request Parameter             |
| Invalid API Request. Don’t have this API access | Invalid Request Method                |

---

### CFG-02 · Retrieve Room Information

**Request\_Type:** `RoomInfo`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #519

*Tags: Kiosk Connectivity, Open, PMS Connectivity*

This API provides room types, rate types and rate plans information for a property. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “RoomInfo”</td>
<td></td>
</tr>
<tr class="odd">
<td>NeedPhysicalRooms</td>
<td>INT(2)</td>
<td>If you need Room data, then put it “1”.<br />
It is optional</td>
<td>1 / 0</td>
</tr>
<tr class="even">
<td>HotelCode *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
</tbody>
</table>

**Request **

``` json
 {    
            "RES_Request": {
            "Request_Type": "RoomInfo",
            "NeedPhysicalRooms":1,
            "Authentication": {
                "HotelCode": "xxxx",
                "AuthCode": "xxxxxxxxxxxx"
            }
    }
} 
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>RoomType.ID</td>
<td>Integer</td>
<td>Unique RoomType ID</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RoomType.Name</td>
<td>String</td>
<td>RoomType Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="even">
<td>RoomType.Rooms.<br />
RoomID</td>
<td>Integer</td>
<td>Room Unique ID</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RoomType.Rooms.<br />
RoomName</td>
<td>String</td>
<td>Room Number/Name</td>
<td>101</td>
</tr>
<tr class="even">
<td>RateType.ID</td>
<td>Integer</td>
<td>Unique RateType ID</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RateType.Name</td>
<td>String</td>
<td>RateType Name</td>
<td>European Plan</td>
</tr>
<tr class="even">
<td>RatePlan.RatePlanID</td>
<td>Integer</td>
<td>Unique RatePlan ID</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RatePlan.Name</td>
<td>String</td>
<td>RatePlan Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="even">
<td>RatePlan.RoomTypeID</td>
<td>Integer</td>
<td>RoomType ID</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RatePlan.RoomType</td>
<td>String</td>
<td>RoomType Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="even">
<td>RatePlan.RateTypeID</td>
<td>Integer</td>
<td>RateType ID</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RatePlan.RateType</td>
<td>String</td>
<td>RateType Name</td>
<td>European Plan</td>
</tr>
<tr class="even">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>301, 404 etc</td>
</tr>
<tr class="odd">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Success, Unauthorized Request etc.</td>
</tr>
</tbody>
</table>

**Success**

``` json
 {  "RoomInfo": {
    "RoomTypes": {
      "RoomType": [
        {
          "ID": "1234500000000000001",
          "Name": "Sea View Deluxe Room",
          "Rooms": [
           {
               "RoomID": "1234500000000000001",
               "RoomName": "101"
           },
          {
                "RoomID": "1234500000000000002",
                "RoomName": "102"
          }
        },
        {
          "ID": "1234500000000000002",
          "Name": "Garden View Studio Room",
          "Rooms": [
           {
                 "RoomID": "1234500000000000004",
                 "RoomName": "201"
            },
           {
                "RoomID": "1234500000000000005",
                "RoomName": "202"
           }
        }
      ]
    },
    "RateTypes": {
      "RateType": [
        {
          "ID": "1234500000000000001",
          "Name": "European Plan"
        },
        {
          "ID": "1234500000000000002",
          "Name": "Continental Plan"
        },
        {
          "ID": "1234500000000000005",
          "Name": "Indian Plan"
        }
      ]
    },
    "RatePlans": {
      "RatePlan": [
        {
          "RatePlanID": "1234500000000000001",
          "Name": "Sea View Deluxe Room",
          "RoomTypeID": "1234500000000000001",
          "RoomType": "Sea View Deluxe Room",
          "RateTypeID": "1234500000000000001",
          "RateType": "European Plan",
          "RatePlanType": "INDEPENDENT"
        },
        {
          "RatePlanID": "1234500000000000015",
          "Name": "Garden View Studio Room",
          "RoomTypeID": "1234500000000000002",
          "RoomType": "Garden View Studio Room",
          "RateTypeID": "1234500000000000001",
          "RateType": "European Plan",
          "RatePlanType": "MASTER"
        }
      ]
    }
  },
  "Errors": {
    "ErrorCode": "0",
    "ErrorMessage": "Success"
  }
} 
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters.                                                 |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |

---

### CFG-03 · Retrieve Hotel Information

**Request\_Type:** `HotelList`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=HotelList&HotelCode=XXXX&APIKey=XXXXXX&language=en`  ·  **eZee ref:** #574

*Tags: Meta Search, Open*

This API provides the list of hotel information for groups or chains. This is mainly used for displaying data to the combo box only. The API can return data in JSON formats. The web service responds to HTTP GET requests.

**URL** **Request:**

Request parameters are supplied by appending a question mark (?) to the base URI, followed by a sequence of parameter names and values separated by an ampersand (&).

**End Point URL**

The base URI for the web service for Chain Properties is as follows :

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&GroupCode=[Group_Code]&APIKey=[API_KEY];
```

The base URI for the web service for Single Property is as follows :

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY];
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="http://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[request_type] *</td>
<td>–</td>
<td>Use Keyword “HotelList”</td>
<td>–</td>
</tr>
<tr class="even">
<td>[GroupCode] *<br />
[HotelCode] *</td>
<td>INT(11)</td>
<td>Unique Group code Or Hotel code</td>
<td>XXXXXX or XXXX</td>
</tr>
<tr class="odd">
<td>[APIKey] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en. <br />
<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
</tbody>
</table>

**Single Properties** – **Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=HotelList&HotelCode=XXXX&APIKey=XXXXXX&language=en

**Chain Properties** – **Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=HotelList&GroupCode=XXXXXX&APIKey=XXXXXX&language=en

**Success**

``` json
[
{
"Hotel_Code": "xxxx", 
"Hotel_Name": "Hotel Abc", 
"City": "Surat",
"State": "Guj",
"Country": "India",
 "Property_Type": "Resort",
 "HotelImages": [
"abc1.jpg",
"abc21.jpg",
]
},
{
"Hotel_Code": "xxxx", 
"Hotel_Name": "Hotel ZY", 
"City": "Surat",
"State": "Gujarat",
"Country": "India",
 "Property_Type": "Hotel", 
"HotelImages": [
"img.jpg"
]
},
]
```

**Error** **Codes**

|                   |                                                                                                                                                  |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**    | **Error Name**                                                                                                                                   |
| HotelCodeEmpty    | Hotel code is empty.                                                                                                                             |
| NORESACC          | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ         | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| HotelListingError | Hotel List error                                                                                                                                 |
| -1                | No Data found.                                                                                                                                   |
| APIACCESSDENIED   | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing | Missing parameters.                                                                                                                              |

---

### CFG-04 · Retrieve Hotel Amenities

**Request\_Type:** `HotelAmenity`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=HotelAmenity&HotelCode=XXX&APIKey=XXX&language=en`  ·  **eZee ref:** #582

*Tags: Meta Search, Open*

This API provides list of hotels amenities of a property which is used for displaying on any website or external applications. The API can return data in JSON formats. The web service responds to HTTP GET requests.

**URI Request:**

Request parameters are supplied by appending a question mark (?) to the base URI, followed by a sequence of parameter names and values separated by an ampersand (&).

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&language=[LANGUAGE];
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="http://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “HotelAmenity”</td>
<td>–</td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en. <br />
<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=HotelAmenity&HotelCode=XXX&APIKey=XXX&language=en

**Success**

``` json
[
{
"amenity": "Chinar Hotel @ Spa Naftalan"
},
{
"amenity": "STD and IDD dialing access"
},
{
"amenity": "parking lot"
},
{
"amenity": "Fruit basket upon check-in"
},
]
```

**Error** **Codes**

|                          |                                                                                                                                                  |
|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**           | **Error Name**                                                                                                                                   |
| HotelCodeEmpty           | Hotel code is empty.                                                                                                                             |
| NORESACC                 | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ                | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| HotelAmenityListingError | Hotel amenity listing error.                                                                                                                     |
| -1                       | No Data found.                                                                                                                                   |
| APIACCESSDENIED          | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing        | Missing parameters.                                                                                                                              |

---

### CFG-05 · Retrieve Room Types

**Request\_Type:** `RoomTypeList`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=RoomTypeList&HotelCode=XXX&APIKey=XXX&language=en&publishtoweb=1`  ·  **eZee ref:** #587

*Tags: Meta Search, Open*

This API provides limited information of roomtypes for a property which can be used for the mapping or display purpose in the external applications. The API can return data in JSON formats. The web service responds to HTTP GET requests.

**URI Request**

Request parameters are supplied by appending a question mark (?) to the base URI, followed by a sequence of parameter names and values separated by an ampersand (&).

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&publishtoweb=1;
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “RoomTypeList”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en.<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
<tr class="odd">
<td>publishtoweb</td>
<td>TINYINT(1)</td>
<td>1 – will retrieve all Room Types0 – will retrieve room types which are published to WEBDefault value is 0</td>
<td>0 OR 1</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=RoomTypeList&HotelCode=XXX&APIKey=XXX&language=en&publishtoweb=1

****Response****

|                      |               |                                 |                    |
|----------------------|---------------|---------------------------------|--------------------|
| **Name**             | **Data Type** | **Description**                 | **Example**        |
| roomtypeunkid        | INT(20)       | Unique Room Type ID             | 123400000000000001 |
| roomtype             | VARCHAR(255)  | Room Type Name                  | Deluxe, Luxury     |
| base_adult_occupancy | INT(11)       | Base adult occupancy in room    | 2                  |
| base_child_occupancy | INT(11)       | Base child occupancy in room    | 2                  |
| max_adult_occupancy  | INT(11)       | Maximum adult occupancy in room | 4                  |
| max_child_occupancy  | INT(11)       | Maximum child occupancy in room | 4                  |

**Success**

``` json
[
{
"roomtypeunkid": "123400000000000001",
"roomtype": "King",
"shortcode": "KNG",
"base_adult_occupancy": "2",
"base_child_occupancy": "2",
"max_adult_occupancy": "4",
"max_child_occupancy": "4"
},
{
"roomtypeunkid": "123400000000000004",
"roomtype": "Deluxe",
"shortcode": "DLX",
"base_adult_occupancy": "5",
"base_child_occupancy": "5",
"max_adult_occupancy": "6",
"max_child_occupancy": "7"
},
{
"roomtypeunkid": "123400000000000006",
"roomtype": "Suite River View",
"shortcode": "SRV",
"base_adult_occupancy": "3",
"base_child_occupancy": "2",
"max_adult_occupancy": "5",
"max_child_occupancy": "3"
}
]
```

**Error** **Codes**

|                      |                                                                                                                                                  |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**       | **Error Name**                                                                                                                                   |
| HotelCodeEmpty       | Hotel code is empty.                                                                                                                             |
| NORESACC             | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ            | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| getRoomTypeListError | Room Type List error                                                                                                                             |
| -1                   | No Data found.                                                                                                                                   |
| APIACCESSDENIED      | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing    | Missing parameters.                                                                                                                              |

---

### CFG-06 · Retrieve Salutations and Country

**Request\_Type:** `ConfiguredDetails`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ConfiguredDetails&HotelCode=XXXX&APIKey=XXXXXX&language=en`  ·  **eZee ref:** #589

*Tags: Meta Search, Open*

This API provides information of salutations and country list available for your property which can be displayed in the external applications. The API can return data in JSON formats. The web service responds to HTTP GET requests.

**URI Request**

Request parameters are supplied by appending a question mark (?) to the base URI, followed by a sequence of parameter names and values separated by an ampersand (&).

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&language=[LANGUAGE]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “ConfiguredDetails”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en.<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>Optional Default is en</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ConfiguredDetails&HotelCode=XXXX&APIKey=XXXXXX&language=en

****Response****

|              |               |                     |                     |
|--------------|---------------|---------------------|---------------------|
| **Name**     | **Data Type** | **Description**     | **Example**         |
| Salution     | String        | Get salutation list | Dr,Jr               |
| Country List | String        | Get country list    | Afghanistan,Albania |

**Success**

``` json
{
"Salutation": { "DR": "Dr.",
"JN": "Jn.",
"MAM": "Mam.",
"MR": "Mr.",
"MRS": "Mrs.",
"MS": "Ms.",
"SIR": "Sir",
"SR": "Sr."
},
"CountryList": {
"1": "Afghanistan",
"2": "Albania",

        "3": "Algeria",
.....
}
}
```

**Error** **Codes**

|                   |                                                                                                                                                  |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**    | **Error Name**                                                                                                                                   |
| HotelCodeEmpty    | Hotel code is empty.                                                                                                                             |
| NORESACC          | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ         | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                 | Cannot Parse Request                                                                                                                             |
| 5                 | Recoverable Error. Equivalent to http 503.                                                                                                       |
| DBConnectError    | Database not connected.                                                                                                                          |
| BadRequest        | Bad request type.                                                                                                                                |
| -1                | No Data found.                                                                                                                                   |
| APIACCESSDENIED   | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing | Missing parameters.                                                                                                                              |
| UnknownError      | Unknown Error                                                                                                                                    |
| 4                 | Timeout requested. Stops requests for the specified time.                                                                                        |
| InvalidHotelCode  | Invalid Hotel code.Please check your property code.                                                                                              |

---

### CFG-07 · Retrieve Extras Rate Based on Parameters

**Request\_Type:** `CalculateExtraCharge`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=CalculateExtraCharge&HotelCode=XXX&APIKey=XXX&check_in_date=XXX&check_out_date=XXX&ExtraChargeId=XXX&Total_ExtraItem=X`  ·  **eZee ref:** #594

*Tags: eZee Reservation Required, Meta Search*

This API will give you a total extra service rate on the basis of configured Extra Charges, check in date and check out date in your property.  The API can return data in JSON formats. The web service responds to HTTP GET requests.

This API will fulfill both needs to give you details for single extra charges or multiple extra charges at a time. You need to take **eZee Reservation** to use this API. 

**URI Request**

Request parameters are supplied by appending a question mark (?) to the base URI, followed by a sequence of parameter names and values separated by an ampersand (&).

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&check_in_date=[CHECK_IN_DATE]&check_out_date=[CHECK_OUT_DATE]&ExtraChargeId=[EXTRACHARGEID]&Total_ExtraItem=[TOTAL_EXT RAITEM]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="http://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “CalculateExtraCharge”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[CHECK_IN_DATE] *</td>
<td>DATE</td>
<td>Pass Check in date in YYYY-MM-DD format</td>
<td>2020-07-05</td>
</tr>
<tr class="odd">
<td>[CHECK_OUT_DATE] *</td>
<td>DATE</td>
<td>Pass Check out date in YYYY-MM-DD format</td>
<td>2020-07-07</td>
</tr>
<tr class="even">
<td>[EXTRACHARGEID] *</td>
<td>VARCHAR(300)</td>
<td>Pass [single|multiple] extra charge id’s for your property</td>
<td>Single : XXX<br />
Multiple : XXX, YYY</td>
</tr>
<tr class="odd">
<td>[TOTAL_EXT RAITEM] *</td>
<td>VARCHAR(300)</td>
<td>Pass total number of items for  [single|multiple] extra charges</td>
<td>Single : 2<br />
Multiple : 2, 3<br />
<br />
<strong>Sample 1:</strong><br />
Extra charge Rule : Per Pax,<br />
Adults : 2, Child : 1 Pass [TOTAL_EXTRAITEM] = 3<br />
<br />
<strong>Sample 2:</strong><br />
Extra charge Rule : Per Quantity, Quantity: 2 Pass [TOTAL_EXTRAITEM] = 2</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=CalculateExtraCharge&HotelCode=XXX&APIKey=XXX&check_in_date=XXX&check_out_date=XXX&ExtraChargeId=XXX&Total_ExtraItem=X

****Response****

|                  |               |                           |             |
|------------------|---------------|---------------------------|-------------|
| **Name**         | **Data Type** | **Description**           | **Example** |
| IndividualCharge |               | List of Individual Charge | xxx         |
| TotalCharge      |               | Total of charge           | 160         |

**Success**

``` json
{
"IndividualCharge": { "XXX": 150,
"YYY": 10
},
"TotalCharge": 160
}
```

**Error** **Codes**

|                         |                                                                                                                                                  |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**          | **Error Name**                                                                                                                                   |
| HotelCodeEmpty          | Hotel code is empty.                                                                                                                             |
| NORESACC                | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ               | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                       | Cannot Parse Request                                                                                                                             |
| 5                       | Recoverable Error. Equivalent to http 503.                                                                                                       |
| CheckDate               | Check out date should be greater than Check in date                                                                                              |
| DBConnectError          | Database not connected.                                                                                                                          |
| getExtraChargeListError | Extra Charge List error                                                                                                                          |
| -1                      | No Data found.                                                                                                                                   |
| APIACCESSDENIED         | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing       | Missing parameters.                                                                                                                              |
| UnknownError            | Unknown Error                                                                                                                                    |
| 4                       | Timeout requested. Stops requests for the specified time.                                                                                        |
| InvalidHotelCode        | Invalid Hotel code.Please check your property code.                                                                                              |
| BadRequest              | Bad request type.                                                                                                                                |

---

### CFG-08 · Verify Travel Agent

**Request\_Type:** `VerifyUser`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?APIKey=XX&request_type=VerifyUser&username=XX&password=XX&groupcode=XX`  ·  **eZee ref:** #596

*Tags: eZee Reservation Required, Meta Search*

In this API, we expect some details from the client to be sent in request and based on that request we verify Travel Agent user and return verified Travel Agent information for properties in which it is created. The API can return data in JSON formats. The web service responds to HTTP GET requests.

You need to take **eZee Reservation** to use this API.

**URI Request**

Request parameters are supplied by appending a question mark (?) to the base URI, followed by a sequence of parameter names and values separated by an ampersand (&).

**End Point URL**

``` json
[BaseUrl]/booking/reservation_api/listing.php?APIKey=[APIKey]&request_type=[request_type]&username=[username]&password=[password]&groupcode=[groupcode]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="http://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “VerifyUser”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[username] *</td>
<td>VARCHAR(300)</td>
<td>Pass travel agent user name</td>
<td>XXXXXXXXX</td>
</tr>
<tr class="odd">
<td>[password] *</td>
<td>VARCHAR(300)</td>
<td>Pass base_64 encoded encrypted password.<br />
Here’s the <a href="https://www.tools4noobs.com/online_php_functions/base64_encode">online tool</a> for base_64 encoded encryption </td>
<td>base64_encode($x)</td>
</tr>
<tr class="even">
<td>[groupcode] *</td>
<td>VARCHAR(300)</td>
<td>Unique group code for each registered chain of properties. </td>
<td>XXXXX</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?APIKey=XX&request_type=VerifyUser&username=XX&password=XX&groupcode=XX

****Response****

|               |               |                    |                               |
|---------------|---------------|--------------------|-------------------------------|
| **Name**      | **Data Type** | **Description**    | **Example**                   |
| contactunkid  | Integer(20)   | Unique contact id  | xxxxxxxxxxxx                  |
| salutation    | String        | Salutation of user | 301, 404 etc                  |
| business_name | String        | Name of business   | Reservation already processed |
| name          | String        | User name          | Jhon                          |
| address       | String        | Address of user    | 3817 Sugar Camp Road          |
| city          | String        | City name          | New York                      |
| state         | String        | State name         | New York                      |
| zipcode       | Integer       | zipcode            | 123456                        |
| country       | String        | Country name       | USA                           |
| phone         | Integer       | Phone number       | 123456789                     |
| mobile        | Integer       | Mobile number      | 1234567890                    |
| email         | String        | Email id           | PamalaWHam@rhyta.com          |
| isusercreated | String        | Is user created    | 1 or 0                        |

**Success**

    "contact_detail":{
    "26":{"contact_detail":{"contactunkid":"2600000000001612","salutation":"Mr.","business_name":"OLX","name":"Maximum","address":null,"city":null,"state":null,"zipcode":null,"country":"India","phone":null,"mobile":null,"email":"Maximum@gmail.com","isusercreated":"1"}},
    "1023":{"contact_detail":{"contactunkid":"102300000000000844","salutation":"Mr.","business_name":"OLX","name":"Maximum","address":null,"city":null,"state":null,"zipcode":null,"country":"India","phone":null,"mobile":null,"email":"Maximum@gmail.com","isusercreated":"1"}},
    "3419":{"contact_detail":{"contactunkid":"341900000000000098","salutation":"Mr.","business_name":"OLX","name":"Maximum","address":null,"city":null,"state":null,"zipcode":null,"country":"India","phone":null,"mobile":null,"email":"Maximum@gmail.com","isusercreated":"1"}}

**Error** **Codes**

|                  |                                                                                                                                                   |
|------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**   | **Error Name**                                                                                                                                    |
| HotelCodeEmpty   | Hotel code is empty.                                                                                                                              |
| NORESACC1        | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Groups Code and Authentication are invalid. |
| UNAUTHREQ        | Unauthorized request. This request is not valid for this hotel code.                                                                              |
| 2                | Cannot Parse Request                                                                                                                              |
| DBConnectError   | Database not connected.                                                                                                                           |
| BadRequest       | Bad request type.                                                                                                                                 |
| -1               | No Data found.                                                                                                                                    |
| APIACCESSDENIED  | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                        |
| INVUSEPASS       | Invalid Username and Password.                                                                                                                    |
| UnknownError     | Unknown Error                                                                                                                                     |
| InvalidHotelCode | Invalid Hotel code.Please check your property code.                                                                                               |

---

### CFG-09 · Retrieve Payment Gateways

**Request\_Type:** `ConfiguredPGList`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?APIKey=XX&request_type=ConfiguredPGList&HotelCode=XX`  ·  **eZee ref:** #613

*Tags: eZee Reservation Required, Meta Search, Open*

This API provides all payment gateways which are available for your Booking Engine. The API can return data in JSON formats. The web service responds to HTTP GET requests. You need to take **eZee Reservation** to use this API.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?APIKey=[API_KEY]&request_type=[Request_Type]&HotelCode=[Hotel_Code]
```

**Header**

–

#### **Parameter**

|                     |               |                                |                                                       |
|---------------------|---------------|--------------------------------|-------------------------------------------------------|
| **Name**            | **Data Type** | **Description**                | **Example**                                           |
| \[BaseUrl\] \*      | –             | Live server URL                | [https://live.ipms247.com/](http://live.ipms247.com/) |
| \[Request_Type\] \* | –             | Use Keyword “ConfiguredPGList” |                                                       |
| \[Hotel_Code\] \*   | INT(11)       | Unique Hotel code              | XXXX                                                  |
| \[API_KEY\] \*      | VARCHAR(300)  | Unique Authentication code     | XXXXXXXXXXXXXXXX                                      |

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?APIKey=XX&request_type=ConfiguredPGList&HotelCode=XX

****Response****

|                  |                 |                    |              |
|------------------|-----------------|--------------------|--------------|
| **Name**         | **Data Type**   | **Description**    | **Example**  |
| paymenttypeunkid |     Integer(20) | Payment uniqueid   | xxxxxxxxxxxx |
| hotel_code       |     Integer(11) | Unique hotel code  | 1234         |
| shortcode        |     String      | Short code         | AirPay       |
| paymenttype      |     String      | Source of business | AirPay       |

**Success**

``` json
[
{
"paymenttypeunkid": "4000000000000048",
"hotel_code": "1234",
"shortcode": "AirPay",
"paymenttype": "AirPay”
}
]
```

**Error** **Codes**

|                  |                                                                                                                                                  |
|------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**   | **Error Name**                                                                                                                                   |
| HotelCodeEmpty   | Hotel code is empty.                                                                                                                             |
| NORESACC         | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ        | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                | Cannot Parse Request                                                                                                                             |
| DBConnectError   | database not connected.                                                                                                                          |
| -1               | No Data found.                                                                                                                                   |
| APIACCESSDENIED  | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| BadRequest       | Bad request type.                                                                                                                                |
| UnknownError     | Unknown Error                                                                                                                                    |
| InvalidHotelCode | Invalid Hotel code.Please check your property code.                                                                                              |

---

### CFG-10 · Retrieve Currency

**Request\_Type:** `RetrieveCurrency`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2037

*Tags: Kiosk Connectivity, Open*

This API will give you all the currencies available in the hotel. You need to send only active currency of the hotel. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                            |                   |
|-----------------|---------------|----------------------------|-------------------|
| **Name**        | **Data Type** | **Description**            | **Example**       |
| HotelCode \*    | INT(11)       | Unique Hotel code          | XXXX              |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| Request_Type \* | VARCHAR(100)  | Request Type               | RetrieveCurrency  |

**Request **

``` json
 {
       "RES_Request": {
              "Request_Type": "RetrieveCurrency",
               "Authentication": {
                      "HotelCode": "xxxx",
                      "AuthCode": "xxxxxxxxxxxx"
                }
        }
}
 
```

**Response**

|                                   |               |                               |                     |
|-----------------------------------|---------------|-------------------------------|---------------------|
| **Name**                          | **Data Type** | **Description **              | **Example**         |
| CurrencyList-\>CurrencyID         | Integer       | Currency Unique id            | 1234500000000000001 |
| CurrencyList-\>Country            | String        | Country name                  | India               |
| CurrencyList-\>Currency           | String        | Currency Name                 | Rupees              |
| CurrencyList-\>CurrencyCode       | String        | Currency Code                 | INR                 |
| CurrencyList-\>Sign               | String        | Currency sign                 | ₹                   |
| CurrencyList-\>DigitsAfterDecimal | Integer       | Currency Digits After Decimal | 2                   |
| CurrencyList-\>IsBaseCurrency     | String        | Is Base Currency              | 0,1                 |
| CurrencyList-\>ExchangeRate       | Decimal       | Currency Exchange Rate        | 15.0000             |

**Success**

``` json
{      "Success": {   
        "CurrencyList": [
        {
          "CurrencyID": "1234500000000000001",
          "Country": "Argentina",
          "Currency": "Dollar ARS",
          "CurrencyCode": "ARS",
          "Sign": "$",
          "DigitsAfterDecimal": "2",
          "IsBaseCurrency": "0",
          "ExchangeRate": "15.0000"
        },
        {
         "CurrencyID": "1234500000000000002",
          "Country": "India",
          "Currency": "Rupees",
          "CurrencyCode": "INR",
          "Sign": "₹",
          "DigitsAfterDecimal": "2",
          "IsBaseCurrency": "1",
          "ExchangeRate": "1.0000"

        }
      ]
   },
  "Errors": {
    "ErrorCode": "0",
    "ErrorMessage": "Success"
  }
}
```

**Error**

``` json
{       
   "Errors": {
    "ErrorCode": "301",
    "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
  }
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters                                                  |
| 500            | Error occurred during processing.                                            |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive                                                        |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 203            | No Data Found                                                                |

---

### CFG-11 · Retrieve Pay Methods

**Request\_Type:** `RetrievePayMethods`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2048

*Tags: Kiosk Connectivity, Open*

This API will give you all the pay methods available in the hotel. You need to send only active pay methods of the hotel. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                            |                    |
|-----------------|---------------|----------------------------|--------------------|
| **Name**        | **Data Type** | **Description**            | **Example**        |
| HotelCode \*    | INT(11)       | Unique Hotel code          | XXXX               |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX  |
| Request_Type \* | VARCHAR(100)  | Request Type               | RetrievePayMethods |

**Request **

``` json
 {
       "RES_Request": {
              "Request_Type": "RetrievePayMethods",
               "Authentication": {
                      "HotelCode": "xxxx",
                      "AuthCode": "xxxxxxxxxxxx"
                }
        }
}
 
```

**Response**

|                                  |               |                       |                     |
|----------------------------------|---------------|-----------------------|---------------------|
| **Name**                         | **Data Type** | **Description **      | **Example**         |
| PayMethods-\>PayMethodID         | Integer       | Pay Method Unique id  | 1234500000000000001 |
| PayMethods-\>PaymentID           | String        | Payment Unique id     | 1234500000000000001 |
| PayMethods-\>Name                | String        | Pay Method Name       | Cash                |
| PayMethods-\>ShortCode           | String        | Pay Method Short Code | Cash                |
| PayMethods-\>Type                | String        | Pay Method Type       | Cash,Bank           |
| PayMethods-\>CardProcessing      | Integer       | Card Processing       | 0                   |
| PayMethods-\>SurchargeApplicable | String        | Surcharge Applicable  | 1                   |
| PayMethods-\>SurchargeType       | String        | Surcharge Type        | FlatPercent,Amount  |
| PayMethods-\>SurchargeValue      | Decimal       | Surcharge Value       | 5                   |
| PayMethods-\>SurchargeID         | Integer       | Surcharge Unique ID   | 1234500000000000001 |
| PayMethods-\>SurchargeName       | String        | Surcharge Name        | Surcharge           |

**Success**

``` json
{      "Success": {   
        "PayMethods": [
        {
          "PayMethodID": "1234500000000000001",          
          "PaymentID": "1234500000000000001",    
          "Name": "Cash",
          "ShortCode": "Cash",
          "Type": "Cash",
          "CardProcessing": "0",
          "SurchargeApplicable": "1",
          "SurchargeType": "FlatPercent",
          "SurchargeValue": "5",
          "SurchargeID": "1234500000000000001",
          "SurchargeName": "Surcharge"
        },
        {
          "PayMethodID": "1234500000000000002",          
          "PaymentID": "1234500000000000002",    
          "Name": "Cheque",
          "ShortCode": "Chq",
          "Type": "Bank",
          "CardProcessing": "0",
          "SurchargeApplicable": "0",
          "SurchargeType": "",
          "SurchargeValue": "",
          "SurchargeID": "",
          "SurchargeName": ""
        }
      ]
   },
  "Errors": {
    "ErrorCode": "0",
    "ErrorMessage": "Success"
  }
}
```

**Error**

``` json
{    
  "Errors": {
    "ErrorCode": "301",
    "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
  }
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters                                                  |
| 500            | Error occurred during processing.                                            |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive                                                        |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 203            | Payment Methods are not available in this hotel                              |

---

### CFG-12 · Retrieve Identity Type

**Request\_Type:** `RetrieveIdentityType`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2059

*Tags: Kiosk Connectivity, Open*

This API will give you all active Identity Types (Passport, Pancard, etc) available in the hotel. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                            |                      |
|-----------------|---------------|----------------------------|----------------------|
| **Name**        | **Data Type** | **Description**            | **Example**          |
| HotelCode \*    | INT(11)       | Unique Hotel code          | XXXX                 |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX    |
| Request_Type \* | VARCHAR(100)  | Request Type               | RetrieveIdentityType |

**Request **

``` json
 {
       "RES_Request": {
              "Request_Type": "RetrieveIdentityType",
               "Authentication": {
                      "HotelCode": "xxxx",
                      "AuthCode": "xxxxxxxxxxxx"
                }
        }
}
 
```

**Response**

|                               |               |                         |                          |
|-------------------------------|---------------|-------------------------|--------------------------|
| **Name**                      | **Data Type** | **Description **        | **Example**              |
| IdentityType-\>IdentityTypeID | Integer       | Identity Type Unique id | 1234500000000000001      |
| IdentityType-\>Name           | String        | Identity Type Name      | Passport,Driving License |

**Success**

``` json
{      "Success": {   
        "IdentityType": [
        {
           "IdentityTypeID": "1234500000000000001",           
           "Name": "Passport" 
        },
        {
           "IdentityTypeID": "1234500000000000002",          
           "Name": "Driving License"  
        }
      ]
   },
  "Errors": {
    "ErrorCode": "0",
    "ErrorMessage": "Success"
  }
}
```

**Error**

``` json
{       
   "Errors": {
    "ErrorCode": "301",
    "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
  }
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters                                                  |
| 500            | Error occurred during processing.                                            |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive                                                        |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 203            | No Data Found                                                                |

---

### CFG-13 · Retrieve Available Room List

**Request\_Type:** `RoomAvailability`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2336

*Tags: Kiosk Connectivity, Open*

This API will fetch the available room data between check-in and check-out date. Also, you can add Room Unique Id or Roomtype Unique Id, If you will need particular room data. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

**Parameter **

|                        |               |                                |                    |
|------------------------|---------------|--------------------------------|--------------------|
| **Name**               | **Data Type** | **Description**                | **Example**        |
| HotelCode\*            | INT(11)       | Unique Hotel code              | xxxx               |
| AuthCode\*             | VARCHAR(300)  | Unique Authentication code     | xxxxxxxxxx         |
| Request_Type\*         | VARCHAR(100)  | Request Type                   | RoomAvailability   |
| RoomData-\>from_date\* | DATE          | Check-In Date                  | 2021-12-05         |
| RoomData-\>to_date\*   | DATE          | Check-Out Date                 | 2021-12-06         |
| RoomData-\>RoomID      | INT(11)       | Room Unique ID (Optional)      | 123400000000000002 |
| RoomData-\>RoomtypeID  | INT(11)       | Room Type Unique ID (Optional) | 123400000000000002 |

**Request **

``` json
{
       "RES_Request": {
             "Request_Type": "RoomAvailability",
             "Authentication": {
                     "HotelCode": "xxxx",
                     "AuthCode": "xxxxxxxxxxxxxxxxxxxxxxxxxx"
             },
             "RoomData": {
                     "RoomtypeID": "123400000000000002", (Optional)
                     "RoomID": "123400000000000002",  (Optional)
                     "from_date": "2021-11-30",
                     "to_date": "2021-12-10"
             }
       }
}
```

**Response**

|                                  |               |                    |                    |
|----------------------------------|---------------|--------------------|--------------------|
| **Name**                         | **Data Type** | **Description**    | **Example**        |
| RoomList-\> RoomtypeID           | Integer       | Roomtype Unique ID | 123400000000000001 |
| RoomList-\> RoomtypeName         | Varchar       | Roomtype Name      | Deluxe Room        |
| RoomList-\> RoomData-\> RoomID   | Integer       | Room Unique ID     | 123400000000000001 |
| RoomList-\> RoomData-\> RoomName | Varchar       | Room Name/No       | 105                |

**Success**

``` json
{
    "Success": {
      "RoomList": 
      [
         {
               "RoomtypeID": "123400000000000002",
               "RoomtypeName": "Deluxe Room",
               "RoomData": 
                [
                    {
                         "RoomID": "123400000000000011",
                         "RoomName": "101"
                    },
                    {
                          "RoomID": "123400000000000012",
                          "RoomName": "102"
                    },
               ]
        },
        {
              "RoomtypeID": "1234700000000000003",
              "RoomtypeName": "Sea View Room",
              "RoomData":
              [
                   {
                         "RoomID": "123400000000000015",
                         "RoomName": "105"
                   },
              ]
         }
    ]
    },
    "Errors": {
          "ErrorCode": "0",
          "ErrorMessage": "Success"
     }
}
```

**Error**

``` json
{
     "Error": 
     [
        {
           "ErrorCode": "121",
           "ErrorMessage": "Invalid Value. Please check with RoomType Data"
        }
     ]
}
```

**Error** **Codes**

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Error Code</strong></td>
<td><strong>Error Name</strong></td>
</tr>
<tr class="even">
<td>500</td>
<td>Error occurred during processing</td>
</tr>
<tr class="odd">
<td>502</td>
<td>Request Type is missing</td>
</tr>
<tr class="even">
<td>101</td>
<td>Hotel Code is missing</td>
</tr>
<tr class="odd">
<td>102</td>
<td>Authentication Code is missing</td>
</tr>
<tr class="even">
<td>105</td>
<td>From Date is missing</td>
</tr>
<tr class="odd">
<td>106</td>
<td>Date – From Date is not a valid date</td>
</tr>
<tr class="even">
<td>107</td>
<td>To Date is missing</td>
</tr>
<tr class="odd">
<td>108</td>
<td>Date – To Date is not a valid date</td>
</tr>
<tr class="even">
<td>109</td>
<td>From Date: &lt;Date&gt; To Date : &lt;Date&gt; –<br />
Please check From and To date. To Date should be greater than fromdate</td>
</tr>
<tr class="odd">
<td>111</td>
<td>Missing Parameter OR Invalid Parameter : RoomData</td>
</tr>
<tr class="even">
<td>112</td>
<td>Invalid Parameter</td>
</tr>
<tr class="odd">
<td>113</td>
<td>Invalid Value</td>
</tr>
<tr class="even">
<td>121</td>
<td>Invalid Value. Please check with RoomType Data</td>
</tr>
<tr class="odd">
<td>122</td>
<td>Invalid Value. Please check with Room Data</td>
</tr>
<tr class="even">
<td>301</td>
<td>No Data Found</td>
</tr>
<tr class="odd">
<td>201</td>
<td>Unauthorized request.(Request Type) request is not valid for this hotel code</td>
</tr>
<tr class="even">
<td>202</td>
<td>Unauthorized request. Hotel code is not active</td>
</tr>
</tbody>
</table>

---



<!-- ====================================================================== -->


# Rates & Availability

> eZee / YCS Connectivity API — `RA` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

Use the Rates & Availability API to set availability, rates, and restrictions for a property’s rooms at YCS.

**11 endpoints in this file:** RA-01 Update Room Inventory, RA-02 Update Linear Rate, RA-03 Update Non Linear Rate, RA-04 Retrieve Room Rates with Source details, RA-05 Update Max Nights, RA-06 Update Min Nights, RA-07 Update StopSell, RA-08 Update Close On Arrival, RA-09 Update Close On Departure, RA-10 Retrieve Room Inventory, RA-11 Retrieve Room Rates

---

### RA-01 · Update Room Inventory

**Request\_Type:** `UpdateAvailability`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #620

*Tags: PMS Connectivity*

This API provides a provision to update Room(s) Inventory for the specified date range in any property. You must specify a property’s available inventory based on a room type ID. You can’t specify availability at rate plan level, even if the room type has multiple rates plans.

Example : If room type A  is available 10 times, you can’t specify that it can be sold 3 times for rate plan X, and 7 times for rate plan Y. You can only specify the total availability for room type A as 10.

The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                                       |                    |
|-----------------|---------------|---------------------------------------|--------------------|
| **Name**        | **Data Type** | **Description**                       | **Example**        |
| Request_Type \* | –             | Use Keyword “UpdateAvailability”      |                    |
| HotelCode \*    | INT(11)       | Unique Hotel code                     | XXXX               |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code            | XXXXXXXXXXXXXXXXX  |
| RoomTypeID \*   | INT(20)       | Unique RoomType ID                    | 112500000000000001 |
| FromDate \*     | DATETIME      | Update From date.                     | 2020-07-25         |
| ToDate \*       | DATETIME      | Update To date \[Format: yyyy-mm-dd\] | 2020-07-27         |
| Availability \* | Integer       | No. of Inv. Count                     | 5, 10 , 50 etc     |

**Request **

``` json
 {    "RES_Request": {
        "Request_Type": "UpdateAvailability",
        "Authentication": {
            "HotelCode": "xxxx",
            "AuthCode": "xxxxxxxxxxxx"
        },                 
        "RoomType": [
            {
                "RoomTypeID": "112400000000000002",
                "FromDate": "2019-06-24",
                "ToDate": "2019-06-30",
                "Availability": "9"
            },
            {
                "RoomTypeID": "112400000000000002",
                "FromDate": "2019-06-14",
                "ToDate": "2019-06-20",
                "Availability": "9"
            }
        ]
    }
}
```

**Response**

|                     |               |                           |                                     |
|---------------------|---------------|---------------------------|-------------------------------------|
| **Name**            | **Data Type** | **Description**           | **Example**                         |
| Success.SuccessMsg  | –             | Generate Success Response | Room Inventory Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code       | 301, 404 etc                        |
| Errors.ErrorMessage | –             | Generate Response Message | Update operation is not allowed     |

**Success**

``` json
 {    "Success": {
        "SuccessMsg": "Room Inventory Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error**

``` json
 {    "Errors": {
        "ErrorCode": "301",
        "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 103            | Room type is missing                                                                                               |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 110            | Inventory value is missing                                                                                         |
| 111            | Invalid inventory value                                                                                            |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 134            | All Source(s) are using inventory of other source, thefore no update will be allowed.                              |

---

### RA-02 · Update Linear Rate

**Request\_Type:** `UpdateRoomRates`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #626

*Tags: PMS Connectivity*

This API provides a provision to set up linear rates for a specified date range in any property. You must specify property’s rates based on a combination of room type ID and rate type ID. In the linear pricing strategy, you can apply a linear rate to your base price.

Example : The base price of your room is \$3000 for two adults and a child to stay in the room. If any of your guests want to use the same room with an extra adult and child, then the rate will increase by a fixed amount.

The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “UpdateRoomRates”</td>
<td></td>
</tr>
<tr class="odd">
<td>HotelCode *</td>
<td>INT(11)</td>
<td>Unique hotel code generated in the system.</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>AuthCode *</td>
<td>VARCHAR(300)</td>
<td>Unique code to enable the interface</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>Sources-&gt; ContactId</td>
<td>VARCHAR(100)</td>
<td>Source Unique ID</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>RateType -&gt; RoomTypeID *</td>
<td>INT(20)</td>
<td>Unique RoomType ID</td>
<td>112500000000000001</td>
</tr>
<tr class="odd">
<td>RateType -&gt; RateTypeID *</td>
<td>INT(20)</td>
<td>Unique RateType ID</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>RateType -&gt; <br />
FromDate *</td>
<td>DATETIME</td>
<td>Update From date.</td>
<td>2020-06-25</td>
</tr>
<tr class="odd">
<td>RateType -&gt;<br />
ToDate *</td>
<td>DATETIME</td>
<td>Update To date</td>
<td>2020-07-27</td>
</tr>
<tr class="even">
<td>RateType -&gt;<br />
RoomRate -&gt; <br />
Base *</td>
<td>DECIMAL(19,4)</td>
<td>Base rate amount</td>
<td>4000, 1000 etc</td>
</tr>
<tr class="odd">
<td>RateType -&gt;<br />
RoomRate -&gt;<br />
ExtraAdult</td>
<td>DECIMAL(19,4)</td>
<td>Extra adult rate amount [optional]</td>
<td>1000,800 etc</td>
</tr>
<tr class="even">
<td>RateType -&gt;<br />
RoomRate -&gt;<br />
ExtraChild</td>
<td>DECIMAL(19,4)</td>
<td>Extra child rate amount [optional]</td>
<td>500, 200 etc</td>
</tr>
</tbody>
</table>

**Request **

``` json
 {    
"RES_Request": {
        "Request_Type": "UpdateRoomRates",
        "Authentication": {
            "HotelCode": "xxxx",
            "AuthCode": "xxxxxxxxxxxxxxxxx"
        },
       "Sources": {
            "ContactId": [
                "112400000000000873",
                "112400000000000087"
            ]
        },
        "RateType": [
            {
                "RoomTypeID": "112400000000000003",
                "RateTypeID": "112400000000000002",
                "FromDate": "2019-06-20",
                "ToDate": "2019-06-25",
                "RoomRate": {
                    "Base": "159"
                }
            },
            {
                "RoomTypeID": "112400000000000003",
                "RateTypeID": "112400000000000002",
                "FromDate": "2019-06-02",
                "ToDate": "2019-06-06",
                "RoomRate": {
                    "Base": "159",
                    "ExtraAdult": "80",
                    "ExtraChild": "50"
                }
            }
        ]
    }
}
```

**Response**

|                     |               |                           |                                 |
|---------------------|---------------|---------------------------|---------------------------------|
| **Name**            | **Data Type** | **Description**           | **Example**                     |
| Success.SuccessMsg  | –             | Generate Success Response | Room Rates Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code       | 104, 113 etc                    |
| Errors.ErrorMessage | –             | Generate Response Message | Invalid base rate               |

**Success**

``` json
 {    "Success": {
        "SuccessMsg": "Room Rates Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error**

``` json
 {    "Errors": {
        "ErrorCode": "301",
        "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 103            | Room type is missing                                                                                               |
| 104            | Rate type is missing                                                                                               |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 113            | Invalid base rate                                                                                                  |
| 114            | Invalid extra adult rate                                                                                           |
| 115            | Invalid extra child rate                                                                                           |
| 121            | No Rates to update                                                                                                 |

---

### RA-03 · Update Non Linear Rate

**Request\_Type:** `UpdateRoomRatesNL`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #629

*Tags: PMS Connectivity*

This API provides a provision to set up occupancy based rates for a specified date range in any property. You must specify property’s rates based on combination of room type ID and rate type ID. In the non-linear pricing strategy, you’ll be able to levy your room charges as per the number of adults and children staying in a room. Naturally, the charges of adults and children will be separately configured.

Example : The base price of your room is \$3000 for two adults and a child to stay in the room. If the guests bring in one extra child, you can charge an additional \$300. If the guest bring in another child, you can charge in another \$400. It goes the same for extra adults as well.

The non-linear price rate is flexible and can be edited to suit the requirements of your guests. The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “UpdateRoomRatesNL”</td>
<td></td>
</tr>
<tr class="odd">
<td>HotelCode *</td>
<td>INT(11)</td>
<td>Unique hotel code generated in the system.</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>AuthCode *</td>
<td>VARCHAR(300)</td>
<td>Unique code to enable the interface</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>Sources-&gt; ContactId</td>
<td>VARCHAR(100)</td>
<td>Source Unique ID</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>RateType -&gt; RoomTypeID *</td>
<td>INT(20)</td>
<td>Unique RoomType ID</td>
<td>112500000000000001</td>
</tr>
<tr class="odd">
<td>RateType -&gt; RateTypeID *</td>
<td>INT(20)</td>
<td>Unique RateType ID</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>RateType -&gt;<br />
FromDate *</td>
<td>DATETIME</td>
<td>Update From date.</td>
<td>2020-06-25</td>
</tr>
<tr class="odd">
<td>RateType -&gt;<br />
ToDate *</td>
<td>DATETIME</td>
<td>Update To date</td>
<td>2020-07-27</td>
</tr>
<tr class="even">
<td>RateType -&gt;<br />
RoomRate -&gt;<br />
Base *</td>
<td>DECIMAL(19,4)</td>
<td>Base rate amount</td>
<td>4000, 1000 etc</td>
</tr>
<tr class="odd">
<td>RateType -&gt;<br />
RoomRate -&gt;<br />
ExtraAdult</td>
<td>DECIMAL(19,4)</td>
<td>Extra adult rate amount [optional]</td>
<td>1000,800 etc</td>
</tr>
<tr class="even">
<td>RateType -&gt;<br />
RoomRate -&gt;<br />
ExtraChild</td>
<td>DECIMAL(19,4)</td>
<td>Extra child rate amount [optional]</td>
<td>500, 200 etc</td>
</tr>
<tr class="odd">
<td>RateType -&gt;<br />
RoomRate -&gt;<br />
Adult1 – Adult7</td>
<td>DECIMAL(19,4)</td>
<td>Rate amount for upto 7 Adults [optional]</td>
<td>500, 200 etc</td>
</tr>
<tr class="even">
<td>RateType -&gt;<br />
RoomRate -&gt;<br />
Child1 – Child7</td>
<td>DECIMAL(19,4)</td>
<td>Rate amount for upto 7 Childs [optional]</td>
<td>500, 200 etc</td>
</tr>
</tbody>
</table>

**Request **

``` json
{    "RES_Request": {
        "Request_Type": "UpdateRoomRatesNL",
        "Authentication": {
            "HotelCode": "xxxx",
            "AuthCode": "xxxxxxxxxxxxxxxx"
        },
        "Sources": {
            "ContactId": [
                "112400000000000873",
                "112400000000000087"
            ]
        },
        "RateType": [
            {
                "RoomTypeID": "112400000000000003",
                "RateTypeID": "112400000000000001",
                "FromDate": "2019-08-07",
                "ToDate": "2019-08-07",
                "RoomRate": {
                    "Base": "300",
                    "ExtraAdult": "100",
                    "ExtraChild": "70",
                    "Adult1": "100",
                    "Adult2": "200",
                    "Adult3": "300",
                    "Adult4": "400",
                    "Adult5": "500",
                    "Adult6": "600",
                    "Adult7": "700",
                    "Child1": "100",
                    "Child2": "200",
                    "Child3": "300",
                    "Child4": "400",
                    "Child5": "500",
                    "Child6": "600",
                    "Child7": "700"
                }
            },
            {
                "RoomTypeID": "112400000000000002",
                "RateTypeID": "112400000000000001",
                "FromDate": "2019-08-07",
                "ToDate": "2019-08-07",
                "RoomRate": {
                    "Base": "300",
                    "ExtraAdult": "100",
                    "ExtraChild": "70",
                    "Adult1": "100",
                    "Adult2": "200",
                    "Adult3": "300",
                    "Adult4": "400",
                    "Adult5": "500",
                    "Adult6": "600",
                    "Adult7": "700",
                    "Child1": "100",
                    "Child2": "200",
                    "Child3": "300",
                    "Child4": "400",
                    "Child5": "500",
                    "Child6": "600",
                    "Child7": "700"
                }
            }
        ]
    }
}
```

**Response**

|                     |               |                           |                                 |
|---------------------|---------------|---------------------------|---------------------------------|
| **Name**            | **Data Type** | **Description**           | **Example**                     |
| Success.SuccessMsg  | –             | Generate Success Response | Room Rates Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code       | 104, 121 etc                    |
| Errors.ErrorMessage | –             | Generate Response Message | No Rates to update              |

**Success**

``` json
{    "Success": {
        "SuccessMsg": " Room Rates Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error**

``` json
{    "Errors": {
        "ErrorCode": "301",
        "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 103            | Room type is missing                                                                                               |
| 104            | Rate type is missing                                                                                               |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 113            | Invalid base rate                                                                                                  |
| 114            | Invalid extra adult rate                                                                                           |
| 115            | Invalid extra child rate                                                                                           |
| 121            | No Rates to update                                                                                                 |
| 135            | Invalid rate for any between adult1 to adult7                                                                      |

---

### RA-04 · Retrieve Room Rates with Source details

**Request\_Type:** `Separatesourcemapping`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #631

*Tags: PMS Connectivity*

This API provides room types, rate types, rate plans and source information for a property. The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                                     |                   |
|-----------------|---------------|-------------------------------------|-------------------|
| **Name**        | **Data Type** | **Description**                     | **Example**       |
| Request_Type \* | VARCHAR(250)  | Use Keyword “Separatesourcemapping” |                   |
| HotelCode \*    | INT(11)       | Unique Hotel code                   | XXXX              |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code          | XXXXXXXXXXXXXXXXX |

**Request **

``` json
{    
"RES_Request": {
           "Request_Type": "Separatesourcemapping",
           "Authentication": {
               "HotelCode": "xxxx",
               "AuthCode": "xxxxxxxxxxxxxxxxxxx"
           }
    }
}
```

**Response**

|                                      |               |                              |                  |
|--------------------------------------|---------------|------------------------------|------------------|
| **Name**                             | **Data Type** | **Description **             | **Example**      |
| RoomType-\>ID                        | Integer       | Id of room type              | 2700000000000001 |
| RoomType-\>Name                      | String        | Name of room type            | Suite            |
| RateType-\>ID                        | Integer       | Id of rate type              | 2700000000000003 |
| RateType-\>Name                      | String        | Name of rate type            | Non Refundable   |
| RatePlan-\>RatePlanID                | Integer       | Rate Plan Id of rate plan    | 2700000000000007 |
| RatePlan-\>Name                      | String        | Name of rate plan            | King RoomOnly    |
| RatePlan-\>RoomTypeID                | Integer       | Room type id                 | 2700000000000001 |
| RatePlan-\>RoomType                  | String        | Room Type                    | Suite            |
| RatePlan-\>RateTypeID                | Integer       | Rate Type Id                 | 2700000000000003 |
| RatePlan-\>RateType                  | String        | Rate Type                    | Non Refundable   |
| Saparatechannelsource-\>Channel_name | String        | It is giving remarks         | OTA Common Pool  |
| Saparatechannelsource-\>ChannelID    | Integer       | It is giving reservation no. | 2700000000000096 |

**Success**

``` json
 {
     "RoomInfo": {
         "RoomTypes": {
             "RoomType": [
                 {
                     "ID": "2700000000000001",
                     "Name": "Suite"
                 },
             ]
         },
         "RateTypes": {
             "RateType": [
                 {
                     "ID": "2700000000000003",
                     "Name": "Non Refundable"
                 },
             ]
         },
         "RatePlans": {
             "RatePlan": [
                 {
                     "RatePlanID": "2700000000000007",
                     "Name": "King RoomOnly",
                     "RoomTypeID": "2700000000000001",
                     "RoomType": "Suite",
                     "RateTypeID": "2700000000000003",
                     "RateType": "Non Refundable"
                 },
             ]
         },
         "Saparatechannelsources": {
             "Saparatechannelsource": {
                 "Channel_name": "OTA Common Pool",
                 "ChannelID": "2700000000000096"
             }
         }
     },
     "Errors": {
         "ErrorCode": "0",
         "ErrorMessage": "Success"
     }
 }
```

**Error**

``` json
{    "Errors": {
        "ErrorCode": "301",
        "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
    }
}
```

**Error** **Codes**

|                |                                                                                     |
|----------------|-------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                      |
| 202            | Unauthorized request. Hotel code is not active                                      |
| 201            | Unauthorized request.Separatesourcemapping request is not valid for this hotel code |
| 100            | Missing required parameters.                                                        |
| 502            | Request Type is missing                                                             |
| 301            | Unauthorized Request. Please check hotel code and authentication code               |
| 303            | Auth Code is inactive.                                                              |

---

### RA-05 · Update Max Nights

**Request\_Type:** `UpdateMaxNights`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #633

*Tags: PMS Connectivity*

This API helps you to update maximum nights for specific date ranges for a property. With this feature, you can restrict the availability of a room, by specifying a maximum length of stay if the reservation includes a certain date.

The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                                           |                    |
|-----------------|---------------|-------------------------------------------|--------------------|
| **Name**        | **Data Type** | **Description**                           | **Example**        |
| Request_Type \* | –             | Use Keyword “UpdateMaxNights”             |                    |
| HotelCode \*    | INT(11)       | Unique hotel code generated in the system | XXXX               |
| AuthCode \*     | VARCHAR(300)  | Unique code to enable the interface.      | XXXXXXXXXXXXXXXXX  |
| RatePlanID \*   | INT(20)       | Unique Rate Plan ID                       | 112500000000000001 |
| FromDate \*     | DATETIME      | Update From date. \[Format: yyyy-mm-dd\]  | 2020-06-25         |
| ToDate \*       | DATETIME      | Update To date \[Format: yyyy-mm-dd\]     | 2020-07-27         |
| MaxNight \*     | INT(11)       | MaxNight value                            | 2,5,10 etc         |

**Request **

``` json
{    "RES_Request": {
        "Request_Type": "UpdateMaxNights",
        "Authentication": {
            "HotelCode": "xxxx",
            "AuthCode": "xxxxxxxxxxxx"
        },
        "RatePlan": [
            {
                "RatePlanID": "123400000000000001",
                "FromDate": "2019-06-25",
                "ToDate": "2019-06-27",
                "MaxNight": "3"
            },
            {
                "RatePlanID": "123400000000000006",
                "FromDate": "2019-06-22",
                "ToDate": "2019-06-24",
                "MaxNight": "3"
            }
        ]
    }
}
```

**Response**

|                     |               |                                   |                                 |
|---------------------|---------------|-----------------------------------|---------------------------------|
| **Name**            | **Data Type** | **Description**                   | **Example**                     |
| Success.SuccessMsg  | –             | Generate Success Response Message | Max Nights Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code               | 122, 127 etc                    |
| Errors.ErrorMessage | –             | Generate Response Message         | MaxNight value is missing       |

**Success**

``` json
 {    "Success": {
        "SuccessMsg": " Max Nights Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 122            | Rate Plan ID is missing                                                                                            |
| 127            | MaxNight value is missing                                                                                          |
| 128            | Invalid MaxNight value                                                                                             |

---

### RA-06 · Update Min Nights

**Request\_Type:** `UpdateMinNights`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #637

*Tags: PMS Connectivity*

This API helps you to update minimum nights for specific date ranges for a property. With this feature, you can restrict the availability of a room, by specifying a minimum length of stay if the reservation includes a certain date.

The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                                           |                    |
|-----------------|---------------|-------------------------------------------|--------------------|
| **Name**        | **Data Type** | **Description**                           | **Example**        |
| Request_Type \* | –             | Use Keyword “UpdateMinNights”             |                    |
| HotelCode \*    | INT(11)       | Unique hotel code generated in the system | XXXX               |
| AuthCode \*     | VARCHAR(300)  | Unique code to enable the interface.      | XXXXXXXXXXXXXXXXX  |
| RatePlanID \*   | INT(20)       | Unique Rate Plan ID                       | 112500000000000001 |
| FromDate \*     | DATETIME      | Update From date. \[Format: yyyy-mm-dd\]  | 2020-06-25         |
| ToDate \*       | DATETIME      | Update To date \[Format: yyyy-mm-dd\]     | 2020-07-27         |
| MinNight \*     | INT(11)       | MinNight value                            | 2,5,10 etc         |

**Request **

``` json
{    "RES_Request": {
        "Request_Type": "UpdateMinNights",
        "Authentication": {
            "HotelCode": "xxxx",
            "AuthCode": "xxxxxxxxxxxx"
        },
        "RatePlan": [
            {
                "RatePlanID": "123400000000000001",
                "FromDate": "2019-06-25",
                "ToDate": "2019-06-27",
                "MinNight": "3"
            },
            {
                "RatePlanID": "123400000000000006",
                "FromDate": "2019-06-22",
                "ToDate": "2019-06-24",
                "MinNight": "3"
            }
        ]
    }
}
```

**Response**

|                     |               |                                   |                                 |
|---------------------|---------------|-----------------------------------|---------------------------------|
| **Name**            | **Data Type** | **Description**                   | **Example**                     |
| Success.SuccessMsg  | –             | Generate Success Response Message | Min Nights Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code               | 122, 127 etc                    |
| Errors.ErrorMessage | –             | Generate Response Message         | MinNight value is missing       |

**Success**

``` json
{    "Success": {
        "SuccessMsg": " Min Nights Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 122            | Rate Plan ID is missing                                                                                            |
| 127            | MinNight value is missing                                                                                          |
| 128            | Invalid MinNight value                                                                                             |

---

### RA-07 · Update StopSell

**Request\_Type:** `UpdateStopSell`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #643

*Tags: PMS Connectivity*

This API helps you to open/close stop sell for specific date ranges for a property. With this feature, you can restrict the availability of a room, by making a room unavailable to book on a certain date.

The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “UpdateStopSell”</td>
<td></td>
</tr>
<tr class="odd">
<td>HotelCode *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>AuthCode *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>RatePlanID *</td>
<td>INT(20)</td>
<td>Unique Rate Plan ID</td>
<td>123450000000000001</td>
</tr>
<tr class="even">
<td>FromDate *</td>
<td>DATETIME</td>
<td>Update From date. [Format: yyyy-mm-dd]</td>
<td>2020-06-25</td>
</tr>
<tr class="odd">
<td>ToDate *</td>
<td>DATETIME</td>
<td>Update To date [Format: yyyy-mm-dd]</td>
<td>2020-06-27</td>
</tr>
<tr class="even">
<td>StopSell *</td>
<td>INT(1)</td>
<td>Stopsell oprvalue [1 or 0]<br />
1: Enable StopSell<br />
0: Disable Stopsell</td>
<td>1 OR 0</td>
</tr>
</tbody>
</table>

**Request **

``` json
 {   
     "RES_Request": {
        "Request_Type": "UpdateStopSell",
        "Authentication": {
           "HotelCode": "xxxx",
          "AuthCode": "xxxxxxxxxxxxxxx"
         },
        "RatePlan": [
        {
            "RatePlanID": "123450000000000001",
             "FromDate": "2019-06-21",
             "ToDate": "2019-06-22",
             "StopSell": "0"
         },
        {
            "RatePlanID": "123450000000000001",
            "FromDate": "2019-06-25",
            "ToDate": "2019-06-27",
            "StopSell": "0"
        }
       ]
     }
} 
```

**Response**

|                     |               |                                   |                               |
|---------------------|---------------|-----------------------------------|-------------------------------|
| **Name**            | **Data Type** | **Description**                   | **Example**                   |
| Success.SuccessMsg  | –             | Generate Success Response Message | StopSell Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code               | 122, 127 etc                  |
| Errors.ErrorMessage | –             | Generate Response Message         | StopSell value is missing     |

**Success**

``` json
{    "Success": {
        "SuccessMsg": "StopSell Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 122            | Rate Plan ID is missing                                                                                            |
| 127            | StopSell value is missing                                                                                          |
| 128            | Invalid StopSell value                                                                                             |

---

### RA-08 · Update Close On Arrival

**Request\_Type:** `UpdateCOA`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #650

*Tags: PMS Connectivity*

This API helps you to apply close on arrival restrictions for specific date ranges for a property. With this feature, you can restrict the availability of a room, by making a room unavailable to book if the guest checks in on a certain date.

The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “UpdateCOA”</td>
<td></td>
</tr>
<tr class="odd">
<td>HotelCode *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>AuthCode *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>RatePlanID *</td>
<td>INT(20)</td>
<td>Unique Rate Plan ID</td>
<td>123450000000000001</td>
</tr>
<tr class="even">
<td>FromDate *</td>
<td>DATETIME</td>
<td>Update From date. [Format: yyyy-mm-dd]</td>
<td>2020-06-25</td>
</tr>
<tr class="odd">
<td>ToDate *</td>
<td>DATETIME</td>
<td>Update To date [Format: yyyy-mm-dd]</td>
<td>2020-06-27</td>
</tr>
<tr class="even">
<td>COA *</td>
<td>INT(1)</td>
<td>COA oprvalue [1 or 0]<br />
1: Enable COA<br />
0: Disable COA</td>
<td>1 OR 0</td>
</tr>
</tbody>
</table>

**Request **

``` json
 {   
     "RES_Request": {
        "Request_Type": "UpdateCOA",
        "Authentication": {
           "HotelCode": "xxxx",
          "AuthCode": "xxxxxxxxxxxxxxxxxxxx"
         },
        "RatePlan": [
        {
             "RatePlanID": "123450000000000001",
             "FromDate": "2019-06-21",
             "ToDate": "2019-06-22",
             "COA": "0"
         },
        {
            "RatePlanID": "123450000000000001",
            "FromDate": "2019-06-25",
            "ToDate": "2019-06-27",
            "COA": "0"
        }
       ]
     }
} 
```

**Response**

|                     |               |                                   |                          |
|---------------------|---------------|-----------------------------------|--------------------------|
| **Name**            | **Data Type** | **Description**                   | **Example**              |
| Success.SuccessMsg  | –             | Generate Success Response Message | COA Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code               | 122, 127 etc             |
| Errors.ErrorMessage | –             | Generate Response Message         | COA value is missing     |

**Success**

``` json
{    "Success": {
        "SuccessMsg": "COA Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 122            | Rate Plan ID is missing                                                                                            |
| 127            | COA value is missing                                                                                               |
| 128            | Invalid COA value                                                                                                  |

---

### RA-09 · Update Close On Departure

**Request\_Type:** `UpdateCOD`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #654

*Tags: PMS Connectivity*

This API helps you to apply close on departure restrictions for specific date ranges for a property. With this feature, you can restrict the availability of a room, by making a room unavailable to book if the guest checks out on a certain date.

The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “UpdateCOD”</td>
<td></td>
</tr>
<tr class="odd">
<td>HotelCode *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>AuthCode *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>RatePlanID *</td>
<td>INT(20)</td>
<td>Unique Rate Plan ID</td>
<td>123450000000000001</td>
</tr>
<tr class="even">
<td>FromDate *</td>
<td>DATETIME</td>
<td>Update From date. [Format: yyyy-mm-dd]</td>
<td>2020-06-25</td>
</tr>
<tr class="odd">
<td>ToDate *</td>
<td>DATETIME</td>
<td>Update To date [Format: yyyy-mm-dd]</td>
<td>2020-06-27</td>
</tr>
<tr class="even">
<td>COD *</td>
<td>INT(1)</td>
<td>COD oprvalue [1 or 0]<br />
1: Enable COD<br />
0: Disable COD</td>
<td>1 OR 0</td>
</tr>
</tbody>
</table>

**Request **

``` json
 {   
     "RES_Request": {
        "Request_Type": "UpdateCOD",
        "Authentication": {
           "HotelCode": "xxxx",
          "AuthCode": "xxxxxxxxxxxxxxxxxxxx"
         },
        "RatePlan": [
        {
             "RatePlanID": "123450000000000001",
             "FromDate": "2019-06-21",
             "ToDate": "2019-06-22",
             "COD": "0"
         },
        {
            "RatePlanID": "123450000000000001",
            "FromDate": "2019-06-25",
            "ToDate": "2019-06-27",
            "COD": "0"
        }
       ]
     }
} 
```

**Response**

|                     |               |                                   |                          |
|---------------------|---------------|-----------------------------------|--------------------------|
| **Name**            | **Data Type** | **Description**                   | **Example**              |
| Success.SuccessMsg  | –             | Generate Success Response Message | COD Successfully Updated |
| Errors.ErrorCode    | –             | Response Error Code               | 122, 127 etc             |
| Errors.ErrorMessage | –             | Generate Response Message         | COD value is missing     |

**Success**

``` json
{    "Success": {
        "SuccessMsg": "COD Successfully Updated"
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters.                                                                                       |
| 500            | Error occurred during processing                                                                                   |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 105            | From Date is missing                                                                                               |
| 106            | (From Date) – From Date is not a valid date                                                                        |
| 107            | To Date is missing                                                                                                 |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive.                                                                                             |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 122            | Rate Plan ID is missing                                                                                            |
| 127            | COD value is missing                                                                                               |
| 128            | Invalid COD value                                                                                                  |

---

### RA-10 · Retrieve Room Inventory

**Request\_Type:** `Inventory`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/getdataAPI.php`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #662

*Tags: PMS Connectivity, RMS*

The API provides a room inventory data for a specific date range and room type for a property. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/getdataAPI.php>

**Header**

Content-Type: application/xml

#### **Parameter**

|                 |               |                            |                   |
|-----------------|---------------|----------------------------|-------------------|
| **Name**        | **Data Type** | **Description**            | **Example**       |
| Request_Type \* | VARCHAR(250)  | Use Keyword “Inventory”    |                   |
| HotelCode \*    | INT(11)       | Unique Hotel code          | XXXX              |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| FromDate \*     | DATE          | To send a from date        | 2020-07-05        |
| ToDate \*       | DATE          | To send a to date          | 2020-07-07        |

**Request **

``` xml
<RES_Request>   
<Request_Type>Inventory</Request_Type>
   <Authentication>
       <HotelCode>xxxx</HotelCode>
       <AuthCode>xxxxxxxxxx</AuthCode>
   </Authentication>
   <FromDate>2020-03-05</FromDate>
   <ToDate>2020-03-18</ToDate>
</RES_Request>
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.RoomTypeID</td>
<td>INT(11)</td>
<td>Room Type Id</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.FromDate</td>
<td>DATETIME</td>
<td>From date</td>
<td>2020-05-01</td>
</tr>
<tr class="even">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.ToDate</td>
<td>DATETIME</td>
<td>To date</td>
<td>2020-05-10</td>
</tr>
<tr class="odd">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.Availability</td>
<td>INT(11)</td>
<td>No. Of room available</td>
<td>4</td>
</tr>
<tr class="even">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>104, 404 etc</td>
</tr>
<tr class="odd">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Unauthorized Request. etc</td>
</tr>
</tbody>
</table>

**Success**

``` xml
<?xml version="1.0" encoding="UTF-8"?><RES_Response>
    <RoomInfo>
        <Source name="Front">
            <RoomTypes>
                <RoomType>
                    <RoomTypeID>1234500000000000001</RoomTypeID>
                    <FromDate>2020-03-11</FromDate>
                    <ToDate>2020-03-16</ToDate>
                    <Availability>1</Availability>
                </RoomType>
                <RoomType>
                    <RoomTypeID>1234500000000000007</RoomTypeID>
                    <FromDate>2020-03-18</FromDate>
                    <ToDate>2020-03-18</ToDate>
                    <Availability>5</Availability>
                </RoomType>
            </RoomTypes>
        </Source>
    </RoomInfo>
</RES_Response>
```

**Error** **Codes**

|                |                                                                         |
|----------------|-------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                          |
| 114            | Missing from date in some request                                       |
| 115            | Missing to date in some request                                         |
| 117            | From Date is not valid date                                             |
| 118            | To Date is not valid date                                               |
| 119            | Please check From and To date. To Date should be greater than From Date |
| 113            | Missing roomtype id in some request                                     |
| 400            | Invalid Request Format                                                  |
| 302            | Authentication failed                                                   |
| 303            | Auth Code is inactive.                                                  |
| 301            | Unauthorized request. Request is not valid for this hotel code          |
| 202            | Unauthorized request. Hotel code is not active                          |
| 111            | Invalid Request                                                         |

---

### RA-11 · Retrieve Room Rates

**Request\_Type:** `Rate`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/getdataAPI.php`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #667

*Tags: PMS Connectivity, RMS*

The API provides a room rates data for a specific date range, room type and rate type for a property. The API can return data in XML formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/getdataAPI.php>

**Header**

Content-Type: application/xml

#### **Parameter**

|                 |               |                            |                   |
|-----------------|---------------|----------------------------|-------------------|
| **Name**        | **Data Type** | **Description**            | **Example**       |
| Request_Type \* | VARCHAR(250)  | Use Keyword “Rate”         |                   |
| HotelCode \*    | INT(11)       | Unique Hotel code          | XXXX              |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| FromDate \*     | DATE          | To send a from date        | 2020-07-05        |
| ToDate \*       | DATE          | To send a to date          | 2020-07-07        |

**Request **

``` xml
<RES_Request>   
<Request_Type>Rate</Request_Type>
   <Authentication>
       <HotelCode>xxxx</HotelCode>
       <AuthCode>xxxxxxxxxx</AuthCode>
   </Authentication>
   <FromDate>2020-03-05</FromDate>
   <ToDate>2020-03-18</ToDate>
</RES_Request>
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.RoomTypeID</td>
<td>INT(11)</td>
<td>Room Type Id</td>
<td>1234500000000000001</td>
</tr>
<tr class="odd">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.RateTypeID</td>
<td>INT(11)</td>
<td>Rate Plan Id</td>
<td>1234500000000000013</td>
</tr>
<tr class="even">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.FromDate</td>
<td>DATETIME</td>
<td>From date</td>
<td>2020-05-01</td>
</tr>
<tr class="odd">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.ToDate</td>
<td>DATETIME</td>
<td>To date</td>
<td>2020-05-10</td>
</tr>
<tr class="even">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.RoomRate.Base</td>
<td>Decimal(11,4)</td>
<td>Base Rate</td>
<td>2500.0000</td>
</tr>
<tr class="odd">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.RoomRate.ExtraAdult</td>
<td>Decimal(11,4)</td>
<td>Extra Adult Rate</td>
<td>500.0000</td>
</tr>
<tr class="even">
<td>RoomInfo.Source.RoomTypes.<br />
RoomType.RoomRate.ExtraChild</td>
<td>Decimal(11,4)</td>
<td>Extra Child Rate</td>
<td>200.0000</td>
</tr>
<tr class="odd">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>104, 404 etc</td>
</tr>
<tr class="even">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Unauthorized Request. etc</td>
</tr>
</tbody>
</table>

**Success**

``` xml
<?xml version="1.0" encoding="UTF-8"?><RES_Response>
    <RoomInfo>
        <Source name="PMS">
            <RoomTypes>
                <RateType>
                    <RoomTypeID>1234500000000000001</RoomTypeID>
                    <RateTypeID>1234500000000000013</RateTypeID>
                    <FromDate>2020-03-14</FromDate>
                    <ToDate>2020-03-18</ToDate>
                    <RoomRate>
                        <Base>2500.0000</Base>
                        <ExtraAdult>500.0000</ExtraAdult>
                        <ExtraChild>200.0000</ExtraChild>
                    </RoomRate>
                </RateType>
            </RoomTypes>
        </Source>
        <Source name="Hotel Hilton - Web">
            <RoomTypes>
                <RateType>
                    <RoomTypeID>1234500000000000001</RoomTypeID>
                    <RateTypeID>1234500000000000001</RateTypeID>
                    <FromDate>2020-03-14</FromDate>
                    <ToDate>2020-03-15</ToDate>
                    <RoomRate>
                        <Base>750.0000</Base>
                        <ExtraAdult>350.0000</ExtraAdult>
                        <ExtraChild>50.0000</ExtraChild>
                    </RoomRate>
                </RateType>
            </RoomTypes>
        </Source>
    </RoomInfo>
</RES_Response> 
```

**Error** **Codes**

|                |                                                                         |
|----------------|-------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                          |
| 114            | Missing from date in some request                                       |
| 115            | Missing to date in some request                                         |
| 117            | From Date is not valid date                                             |
| 118            | To Date is not valid date                                               |
| 119            | Please check From and To date. To Date should be greater than From Date |
| 113            | Missing roomtype id in some request                                     |
| 400            | Invalid Request Format                                                  |
| 302            | Authentication failed                                                   |
| 303            | Auth Code is inactive.                                                  |
| 301            | Unauthorized request. Request is not valid for this hotel code          |
| 202            | Unauthorized request. Hotel code is not active                          |
| 111            | Invalid Request                                                         |

---



<!-- ====================================================================== -->


# Bookings

> eZee / YCS Connectivity API — `BKG` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

Use the bookings API to retrieve reservations, modifications and cancellations. Beyond that you can even check availability and create bookings.

**32 endpoints in this file:** BKG-01 Check Availability, BKG-02 Retrieve all Bookings, BKG-03 Retrieve a Booking, BKG-04 Booking Received Notification, BKG-05 Retrieve Arrivals, BKG-06 Retrieve Departures, BKG-07 Post Charge To Room, BKG-08 Void Charge on Room, BKG-09 Update POS Receipt No, BKG-10 Retrieve Post to Room Information, BKG-11 Retrieve Post to Room Information for specific room, BKG-12 Room Sales Data, BKG-13 Reserved Rooms Calendar, BKG-14 Retrieve Physical Rooms, BKG-15 Todays CheckIn-Checkout, BKG-16 Reservation Details of a Room, BKG-17 Pull Historical Bookings, BKG-18 Post Create Bookings Actions, BKG-19 Retrieve a Booking Based on Parameters, BKG-20 Read a Booking, BKG-21 Cancel a Booking, BKG-22 Autosync Future Bookings and its modifications, BKG-23 Guest Data Update, BKG-24 Add Payment, BKG-25 Add Guest Profile to Bookings, BKG-26 Guest Check In, BKG-27 Room Assignment, BKG-28 Guest Check Out, BKG-29 Retrieve List of Bills, BKG-30 Retrieve Transaction Details, BKG-31 Create a Booking, BKG-32 Add Extra Charge

---

### BKG-01 · Check Availability

**Request\_Type:** `RoomList`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=RoomList&HotelCode=XX&APIKey=XXXXXX&check_in_date=`  ·  **eZee ref:** #675

*Tags: eZee Reservation Required, Meta Search*

This API helps you to check availability for a room. To check availability, you need to include certain fields in your request like room type, check in date, checkout date, no of rooms, no of nights, pax and many more to fulfill your needs.

The API can return data in JSON formats. The web service responds to HTTP GET requests.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&check_in_date=[CHECK_IN_DATE]&check_out_date=[CHECK_OUT_DATE]&num_nights=[NUMBER_NIGHTS]&number_adults=[NUMBER_ADULTS]&number_children=[NUMBER_CHILDREN]&num_rooms=[NUMBER_ROOMS]&promotion_code=[PROMOTION_CODE]&property_configuration_info=[PROPERTY_CONFIG_INFO]&showtax=[SHOW_TAX]&show_only_available_rooms=[SHOW_ONLY_AVAILABLE_ROOMS]&show_matched_minimum_nights_rateplans=[SHOW_MATCHED_MINIMUM_NIGHTS_RATEPLANS]&language=[LANGUAGE]&roomtypeunkid=[ROOMTYPE_ID]&packagefor=[PACKAGEFLAG]&promotionfor=[PROMOTIONFLAG]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “RoomList”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>check_in_date*</td>
<td>DATE</td>
<td>Check In date. [Format: yyyy-mm-dd]</td>
<td>2020-05-20</td>
</tr>
<tr class="odd">
<td>check_out_date</td>
<td>DATE</td>
<td>Check Out Date [Format: yyyy-mm-dd]</td>
<td>2020-05-30</td>
</tr>
<tr class="even">
<td>num_nights</td>
<td>INT(11)</td>
<td>Defaults to 10 days after the start date.The date range is limited to the first 30 days from the check in date.</td>
<td>1,5,10</td>
</tr>
<tr class="odd">
<td>number_adults</td>
<td>INT(11)</td>
<td>No. of Adult(s). Default is 1</td>
<td>1,2</td>
</tr>
<tr class="even">
<td>number_children</td>
<td>INT(11)</td>
<td>No.of Child(s). Default is 0</td>
<td>1,2</td>
</tr>
<tr class="odd">
<td>num_rooms</td>
<td>INT(11)</td>
<td>Total No. of Room(s). Rooms Default is 1</td>
<td>1,2</td>
</tr>
<tr class="even">
<td>promotion_code</td>
<td>INT(11)</td>
<td>Unique Promotion Code. Default is Empty</td>
<td>112500000000000001</td>
</tr>
<tr class="odd">
<td>property_configuration_info</td>
<td>INT(11)</td>
<td>It is based upon property booking engine settings. Default is 0</td>
<td>0,1</td>
</tr>
<tr class="even">
<td>showtax</td>
<td>INT(11)</td>
<td>Used for tax inclusive &amp; exclusive rates. This is useful when data retrivation does not depend upon whole property configuration. This parameter is used when property_configuration_info is set to 0.</td>
<td>0,1</td>
</tr>
<tr class="odd">
<td>show_only_available_rooms</td>
<td>INT(11)</td>
<td>It has two values 0 OR 1.1 will return all available rate plans only.This is useful while data retrivation is not depend upon the whole property configuration. This parameter is used when property_configuration_info is set to 0.Default value is 0.</td>
<td>0,1</td>
</tr>
<tr class="even">
<td>show_matched_minimum_nights_rateplans</td>
<td>INT(11)</td>
<td>0 – Display All without filtration without filtration on basis of nights 1 – Match with minimum nights criteria2 – Match Exactly with nights selectedThis is useful while data retrivation is not depend upon the whole property configuration. This parameter is used when property_configuration_info is set to 0.</td>
<td>0,1,2</td>
</tr>
<tr class="odd">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
<tr class="even">
<td>roomtypeunkid</td>
<td>INT(20)</td>
<td>Unique RoomType ID</td>
<td>12500000000000001</td>
</tr>
<tr class="odd">
<td>packagefor</td>
<td>VARCHAR(20)</td>
<td>This parameter is optional and also not mandatory to add but please take note that in this case it will give you desktop based package data only.<br />
If you want package data according to desktop or mobile you have to pass parameters according to its value.<br />
</td>
<td><strong>DESKTOP , MOBILE</strong></td>
</tr>
<tr class="even">
<td>promotionfor</td>
<td>VARCHAR(20)</td>
<td>This parameter is optional and also not mandatory to add but please take note that in this case it will give you desktop based promotion data only.<br />
If you want promotion data according to desktop or mobile you have to pass parameters according to its value.<br />
</td>
<td><strong>DESKTOP , MOBILE</strong></td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=RoomList&HotelCode=XX&APIKey=XXXXXX&check_in_date= 2015-07-13&check_out_date=&num_nights=2&number_adults=1 &number_children=0&num_rooms=1&promotion_code=&property_configuration_info=0&showtax=0&show_only_available_rooms=0&language=en&roomtypeunkid=XXXX&packagefor=DESKTOP&promotionfor=DESKTOP

****Response****

|                                          |               |                                                           |                                                     |
|------------------------------------------|---------------|-----------------------------------------------------------|-----------------------------------------------------|
| **Name**                                 | **Data Type** | **Description**                                           | **Example**                                         |
| Room_Name                                | VARCHAR(255)  | Name of Room                                              | Room1, Room2                                        |
| Room_Description                         | VARCHAR(255)  | Room description                                          | Room with a Pool View                               |
| Roomtype_Name                            | VARCHAR(255)  | Room Type                                                 | Deluxe                                              |
| Package_Description                      | VARCHAR(255)  | Package Description                                       | Package Includes Breakfast and Lunch                |
| Roomtype_Short_code                      | VARCHAR(255)  | Room Type short code                                      | R1,R2                                               |
| Specials_Desc                            | VARCHAR(255)  | Specials Details                                          |                                                     |
| specialconditions                        | VARCHAR(255)  | Special Conditions                                        |                                                     |
| specialhighlightinclusion                | VARCHAR(255)  | Special Highlight Inclusion                               |                                                     |
| hotelcode                                | INT(11)       | Unique Hotel code given to property                       | XX                                                  |
| roomtypeunkid                            | INT(11)       | Room Type Unique Id                                       | 114000000000000005                                  |
| ratetypeunkid                            | INT(11)       | Rate Type Unique Id                                       | 114000000000000001                                  |
| roomrateunkid                            | INT(11)       | Rate Plan Unique Id                                       | 114000000000000001                                  |
| base_adult_occupancy                     | INT(11)       | Base adult occupancy in room                              | 2,3                                                 |
| base_child_occupancy                     | INT(11)       | Base child occupancy in room                              | 2,3                                                 |
| max_adult_occupancy                      | INT(11)       | Maximum adult occupancy in room                           | 2,3                                                 |
| max_child_occupancy                      | INT(11)       | Maximum child occupancy in room                           | 2,3                                                 |
| max_occupancy                            | INT(11)       | Maximum Occupancy                                         |                                                     |
| inclusion                                | VARCHAR(200)  | Inclusion                                                 |                                                     |
| available_rooms                          | INT(11)       | Room Inventory date wise array                            | 2,3                                                 |
| min_ava_rooms                            | INT(11)       | Minimum Inventory from available rooms of each date       | 2,3                                                 |
| **room_rates_info**                      |               |                                                           |                                                     |
| before_discount_inclusive_tax_adjustment | DECIMAL(19,4) | Date wise strike rates with inclusive of tax & adjustment | 2000,1500                                           |
| exclusive_tax                            | DECIMAL(19,4) | Per night room rates exclusive of tax                     | 2000,1500                                           |
| tax                                      | DECIMAL(19,4) | Per night room tax only                                   | 2000,1500                                           |
| adjustment                               | DECIMAL(19,4) | Per night room rate adjustment only                       | 2000,1500                                           |
| inclusive_tax_adjustment                 | DECIMAL(19,4) | Per night room rate inclusive of tax & adjustment         | 2000,1500                                           |
| rack_rate                                | DECIMAL(19,4) | Room level rack rate                                      | 2000,1500                                           |
| totalprice_room_only                     | DECIMAL(19,4) | Total room rates exclusive of tax                         | 2000,1500                                           |
| totalprice_inclusive_all                 | DECIMAL(19,4) | Total room price inclusive of all taxes & adjustment      | 2000,1500                                           |
| avg_per_night_before_discount            | DECIMAL(19,4) | Average Per night rate without discount                   | 2000,1500                                           |
| avg_per_night_after_discount             | DECIMAL(19,4) | Average per night rate after discount                     | 2000,1500                                           |
| avg_per_night_without_tax                | DECIMAL(19,4) | Average per night without tax                             | 2000,1500                                           |
| day_wise_baserackrate                    | DECIMAL(19,4) | Day wise base rack rate                                   | 2000,1500                                           |
| day_wise_beforediscount                  | DECIMAL(19,4) | Day wise before discount                                  | 2000,1500                                           |
| **extra_adult_rates_info**               |               |                                                           |                                                     |
| exclusive_tax                            | DECIMAL(19,4) | Per night extra adult rates exclusive of tax              | 2000,1500                                           |
| tax                                      | DECIMAL(19,4) | Per night extra adult rate tax only                       | 2000,1500                                           |
| adjustment                               | DECIMAL(19,4) | Per night extra adult rate adjustment only                | 0,0.10                                              |
| inclusive_tax_adjustment                 | DECIMAL(19,4) | Per night extra adult rate inclusive of tax &adjustment   | 2000,1500                                           |
| rack_rate                                | DECIMAL(19,4) | Room level extra adult rack rate                          | 2000,1500                                           |
| **extra_child_rates_info**               |               |                                                           |                                                     |
| exclusive_tax                            | DECIMAL(19,4) | Per night extra child rates exclusive of tax              | 1000,500                                            |
| tax                                      | DECIMAL(19,4) | Per night extra child rate tax only                       | 1000,500                                            |
| adjustment                               | DECIMAL(19,4) | Per night extra child rate adjustment only                | 1000,500                                            |
| inclusive_tax_adjus tment                | DECIMAL(19,4) | Per night extra child rate inclusive of tax & adjustment  | 1000,500                                            |
| exclusive_tax                            | DECIMAL(19,4) | Per night extra child rates exclusive of tax              | 1000,500                                            |
| rack_rate                                | DECIMAL(19,4) | Room level extra child rack rate                          | 1000,500                                            |
|                                          |               |                                                           |                                                     |
| Avg_min_nights                           | INT(11)       | Avg minimum nights                                        | 1                                                   |
| Min_nights                               | INT(11)       | Minimum stay for each night                               | 2,4                                                 |
| Avg_max_nights                           | INT(11)       | Avg maximum nights                                        | 3                                                   |
| currency_code                            | VARCHAR(20)   | Currency Code                                             | USD                                                 |
| currency_sign                            | VARCHAR(20)   | Currency Sign                                             | \$                                                  |
| RoomAmenities                            | VARCHAR(2000) | Room Amenities                                            | TV, refrigerator,AC                                 |
| RoomImages                               | VARCHAR(255)  | Room Images                                               |                                                     |
| ShowPriceFormat                          | DECIMAL(19,4) | Show Rates Average Per Night Or Price for WholeStay       | Show Rates Average Per Night Or Price for WholeStay |
| DefaultDisplyCurrencyCode                | VARCHAR(20)   | Default Currency Code                                     | USD                                                 |
| check_in_time                            | TIME          | Hotel Check in time                                       | 12:00                                               |
| check_out_time                           | TIME          | Hotel Check out time                                      | 12:00                                               |
| Hotel_amenities                          | VARCHAR(2000) | Hotel amenities                                           | AC, TV                                              |
| TaxName                                  | VARCHAR(2000) | All Tax name which are apply                              | Tax1,Tax2                                           |

**NOTES :**

System will give you per room rates , for multiple rooms you have to calculate based upon above details.

System will not calculate any extra adult & child rate. That information too available in above response data.

**Success**

``` json
[  {
    "Room_Name": "Deluxe EP",
    "Room_Description": "Deluxe EP",
    "Roomtype_Name": "Deluxe",
    "Roomtype_Short_code": "DL",
    "Package_Description": "",
    "Specials_Desc": "",
    "specialconditions": "",
    "specialhighlightinclusion": "",
    "hotelcode": "XXXX",
    "roomtypeunkid": "114000000000000005",
    "ratetypeunkid": "114000000000000001",
    "roomrateunkid": "114000000000000011",
    "base_adult_occupancy": "2",
    "base_child_occupancy": "1",
    "max_adult_occupancy": "3",
    "max_child_occupancy": "2",
    "max_occupancy": "",
    "inclusion": "dsfsdf",
    "available_rooms": {
      "2020-11-01": "3",
      "2020-11-02": "3"
    },
    "min_ava_rooms": "3",
    "room_rates_info": {
      "before_discount_inclusive_tax_adjustment": [],
      "exclusive_tax": {
        "2020-11-01": "1300.0000",
        "2020-11-02": "1300.0000"
      },
      "exclusivetax_baserate": {
        "2020-11-01": "1300.0000",
        "2020-11-02": "1300.0000"
      },
      "tax": [],
      "adjustment": {
        "2020-11-01": 0,
        "2020-11-02": 0
      },
      "inclusive_tax_adjustment": {
        "2020-11-01": 1300,
        "2020-11-02": 1300
      },
      "rack_rate": "1300.0000",
      "totalprice_room_only": 2600,
      "totalprice_inclusive_all": 2600,
      "avg_per_night_before_discount": "",
      "avg_per_night_after_discount": 1300,
      "avg_per_night_without_tax": 1300,
      "day_wise_baserackrate": [
        "1300.0000",
        "1300.0000"
      ],
      "day_wise_beforediscount": [
        "1300.0000",
        "1300.0000"
      ]
    },
    "extra_adult_rates_info": {
      "exclusive_tax": {
        "2020-11-01": "800.0000",
        "2020-11-02": "800.0000"
      },
      "tax": [],
      "adjustment": {
        "2020-11-01": 0,
        "2020-11-02": 0
      },
      "inclusive_tax_adjustment": {
        "2020-11-01": 800,
        "2020-11-02": 800
      },
      "rack_rate": "800.0000"
    },
    "extra_child_rates_info": {
      "exclusive_tax": {
        "2020-11-01": "500.0000",
        "2020-11-02": "500.0000"
      },
      "tax": [],
      "adjustment": {
        "2020-11-01": 0,
        "2020-11-02": 0
      },
      "inclusive_tax_adjustment": {
        "2020-11-01": 500,
        "2020-11-02": 500
      },
      "rack_rate": "500.0000"
    },
    "min_nights": {
      "2020-11-01": 1,
      "2020-11-02": 1
    },
    "Hotel_amenities": "[]",
    "Avg_min_nights": 1,
    "max_nights": {
      "2020-11-01": "",
      "2020-11-02": ""
    },
    "Avg_max_nights": "",
    "check_in_time": "12:00",
    "check_out_time": "12:00",
    "TaxName": [],
    "ShowPriceFormat": "Average Per Night Rate",
    "DefaultDisplyCurrencyCode": null,
    "deals": "",
    "IsPromotion": false,
    "Promotion_Code": null,
    "Promotion_Description": null,
    "Promotion_Name": null,
    "Promotion_Id": null,
    "Package_Name": "",
    "Package_Id": "",
    "currency_code": "INR",
    "currency_sign": "₹",
    "localfolder": "shafinhotels",
    "CalDateFormat": "dd-mm-yy",
    "ShowTaxInclusiveExclusiveSettings": "1",
    "hidefrommetasearch": "",
    "prepaid_noncancel_nonrefundable": "0",
    "cancellation_deadline": "",
    "digits_after_decimal": "2",
    "visiblity_nights": "false",
    "BookingEngineURL": "<url>/booking/book-rooms-shafinhotels",
    "RoomAmenities": "Bed,TV,Refrigerator,AC",
    "room_main_image": ""
  },
] 
```

**Error** **Codes**

|                       |                                                                                                                                                  |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**        | **Error Name**                                                                                                                                   |
| HotelCodeEmpty        | Hotel code is empty.                                                                                                                             |
| NORESACC              | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ             | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| NightsLimitExceeded   | You can not request for more then 30 nights.                                                                                                     |
| CheckDate             | Check out date should be greater than CheckYou can not request for more then 30 nights.                                                          |
| MaxAdultLimitReach    | Requested adults are greater then actual property configuration.                                                                                 |
| RoomListingError      | Room List error                                                                                                                                  |
| -1                    | No Data found.                                                                                                                                   |
| APIACCESSDENIED       | Your property doesn’t have access of API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing     | Missing parameters.                                                                                                                              |
| InvalidSearchCriteria | Invalid search criteria found.Check out date & No of nights can not be pass together.                                                            |
| DateNotvalid          | Requested date is past.                                                                                                                          |
| MaxChildLimitReach    | Requested child are greater then actual property configuration.                                                                                  |

---

### BKG-02 · Retrieve all Bookings

**Request\_Type:** `Bookings`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #681

*Tags: Open, PMS Connectivity*

This API will give you latest updates of bookings which are newly created, modified and canceled. The API can return data in JSON formats. The web service responds to HTTP POST requests.

We recommend periodically calling the API — every minute, so your system can remain in sync with our system thereby keeping your system up-to-date.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                            |                   |
|-----------------|---------------|----------------------------|-------------------|
| **Name**        | **Data Type** | **Description**            | **Example**       |
| Request_Type \* | –             | Use Keyword “Bookings”     |                   |
| HotelCode \*    | INT(11)       | Unique Hotel code          | XXXX              |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |

**Request **

``` json
 {
       "RES_Request": {
              "Request_Type": "Bookings",
              "Authentication": {
                      "HotelCode": "xxxx",
                      "AuthCode": "XXXXXXXXXXXXXXXXXXXXXXXX"
                }
        }
}

 
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>LocationId</td>
<td>INT(11)</td>
<td>Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>UniqueID</td>
<td>VARCHAR(255)</td>
<td>Unique Booking id</td>
<td>10125, 86436, B4525 etc</td>
</tr>
<tr class="even">
<td>BookedBy</td>
<td>VARCHAR(255)</td>
<td>Information regarding Booked by</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email.</td>
<td>VARCHAR(255)</td>
<td>Here * denotes guest information like Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email.</td>
<td>shown in JSON response below.</td>
</tr>
<tr class="even">
<td>Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>PaymentMethod</td>
<td>VARCHAR(255)</td>
<td>Payment Mode selected by guest</td>
<td>Cash, Credit, CityLedger etc</td>
</tr>
<tr class="even">
<td>IsChannelBooking</td>
<td>INT(1)</td>
<td>Is booking comes from channel [0 or 1]<br />
1 : Booking from the channel.<br />
0: Booking not from the channel.</td>
<td>0 or 1</td>
</tr>
<tr class="odd">
<td>BookingTran. SubBookingId</td>
<td>VARCHAR(255)</td>
<td>Sub booking Id</td>
<td>138</td>
</tr>
<tr class="even">
<td>BookingTran. TransactionId</td>
<td>INT(20)</td>
<td>Booking Transaction ID</td>
<td>112500000000000163</td>
</tr>
<tr class="odd">
<td>BookingTran. Status</td>
<td>VARCHAR(1000)</td>
<td>Booking Status</td>
<td>New or Modify or Cancel.</td>
</tr>
<tr class="even">
<td>BookingTran.I sConfirmed</td>
<td>INT(1)</td>
<td>Booking Confirmation Flag. [1 or 0]<br />
1 : Confirmed<br />
0 : Not Confirmed</td>
<td>1 or 0.</td>
</tr>
<tr class="odd">
<td>BookingTran.CurrentStatus</td>
<td>VARCHAR(100)</td>
<td>Booking Current Status</td>
<td>Arrived, Checked Out, Cancel, Void, etc</td>
</tr>
<tr class="even">
<td>BookingTran. VoucherNo</td>
<td>VARCHAR(255)</td>
<td>Booking Voucher No</td>
<td>10203049/8512</td>
</tr>
<tr class="odd">
<td>BookingTran. PackageCode</td>
<td>INT(20)</td>
<td>Package Code</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>BookingTran. PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RateplanCode</td>
<td>INT(20)</td>
<td>Unique RatePlan Code</td>
<td>112500000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RateplanName</td>
<td>STRING(1000)</td>
<td>RatePlan Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran. RoomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>112500000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RoomTypeName</td>
<td>STRING(1000)</td>
<td>RoomType Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="odd">
<td>BookingTran. Start</td>
<td>DATE</td>
<td>Check-in date[Format : yyyy-mm-dd]</td>
<td>2017-12-25</td>
</tr>
<tr class="even">
<td>BookingTran. End</td>
<td>DATE</td>
<td>Check-out date [Format : yyyy-mm-dd]</td>
<td>2017-12-27</td>
</tr>
<tr class="odd">
<td>BookingTran.TotalRate</td>
<td>DECIMAL(19,4)</td>
<td>Rate on room in amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran.</td>
<td>DECIMAL(19,4)</td>
<td>Discount on room in</td>
<td>500</td>
</tr>
<tr class="odd">
<td>TotalDiscount</td>
<td><br />
</td>
<td>Amount</td>
<td><br />
</td>
</tr>
<tr class="even">
<td>BookingTran. TotalExtraCharge</td>
<td>DECIMAL(19,4)</td>
<td>Extra charges in amount(if any)</td>
<td>300</td>
</tr>
<tr class="odd">
<td>BookingTran. TotalPayment</td>
<td>DECIMAL(19,4)</td>
<td>Payment for room in amount</td>
<td>2500.54</td>
</tr>
<tr class="even">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes guest informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email, RegistrationNo, IdentityType, IdentityNo, ExpiryDate.</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. TransportationMode</td>
<td>VARCHAR(100)</td>
<td>Mode of transportation</td>
<td>Bus, car etc</td>
</tr>
<tr class="even">
<td>BookingTran. Vehicle</td>
<td>VARCHAR(255)</td>
<td>Detail of vehicle</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. PickupDate</td>
<td>DATE</td>
<td>Pickup date[Format : yyyy-mm-dd]</td>
<td>2017-12-25 etc</td>
</tr>
<tr class="even">
<td>BookingTran. PickupTime</td>
<td>TIME</td>
<td>Pickup time</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Booking.com</td>
</tr>
<tr class="even">
<td>BookingTran. Comment</td>
<td>VARCHAR(1000)</td>
<td>Additional Information or comment.</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. AffiliateName</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Name</td>
<td><br />
</td>
</tr>
<tr class="even">
<td>BookingTran.AffiliateCode</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Code</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes Credit Card Informations like CCLink, CCNo, CCType, CardHolderName, CCExpiryDate,etc</td>
<td>CCLink in encoded with base64_encode.<br />
</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.EffectiveDate</td>
<td>DATETIME</td>
<td>Booking details for particular effective date</td>
<td>2017-12-25 etc</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.PackageCode</td>
<td>INT(20)</td>
<td>Package code</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.R oomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>112500000000000006</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.R oomTypeName</td>
<td>STRING(1000)</td>
<td>RoomType Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.Adult</td>
<td>INT(11)</td>
<td>No. of Adults</td>
<td>2,3,4 etc</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Child</td>
<td>INT(11)</td>
<td>No. of Childs</td>
<td>2,3,4 etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RentalInfo.Rent</td>
<td>DECIMAL(19,4)</td>
<td>Room rental amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Discount</td>
<td>DECIMAL(19,4)</td>
<td>Discount on rental room in amount</td>
<td>500</td>
</tr>
<tr class="odd">
<td>BookingTran.Sharer.*</td>
<td>–</td>
<td>Here * denotes Sharer informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Nationality,Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityTypeID, IdentityNo, ExpiryDate.</td>
<td></td>
</tr>
<tr class="even">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>104, 404 etc</td>
</tr>
<tr class="odd">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Unauthorized Request. etc</td>
</tr>
</tbody>
</table>

**Success**

    1.Single Booking
     {
      "Reservations": {
        "Reservation": [
          {
            "BookingTran": [
              {
                "SubBookingId": "12341254",
                "TransactionId": "123400000000001902",
                "Createdatetime": "2019-09-04 11:40:30",
                "Modifydatetime": "2019-09-04 11:40:30",
                "Status": "New",
                "IsConfirmed": "1",
                "CurrentStatus": "Arrived",
                "VoucherNo": "single1276/1",
                "PackageCode": "123400000000000001",
                "PackageName": "European Plan",
                "RateplanCode": "123400000000000001",
                "RateplanName": "Sea View Deluxe Room",
                "RoomTypeCode": "123400000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Start": "2019-09-26",
                "End": "2019-09-28",
                "ArrivalTime": "12:00:00",
                "DepartureTime": "11:00:00",
                "CurrencyCode": "USD",
                "TotalAmountAfterTax": "976.00",
                "TotalAmountBeforeTax": "800.00",
                "TotalTax": "176.00",
                "TotalDiscount": "0.00",
                "TotalExtraCharge": "0.00",
                "TotalPayment": "0.00",
                "TACommision": "0.00",
                "Salutation": "Ms.",
                "FirstName": "April",
                "LastName": "Myers",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": "Decorah",
                "State": "Decorah",
                "Country": "IA",
                "Nationality": "Malta",
                "Zipcode": "52101",
                "Phone": "",
                "Mobile": "3534",
                "Fax": "564564",
                "Email": "AprilAMyers@jourrapide.com",
                "RegistrationNo" : "", 
                "IdentityType": "Pan card",
                "IdentityNo": "12345667765",
                "ExpiryDate": "",
                "TransportationMode": "",
                "Vehicle": "car",
                "PickupDate": "",
                "PickupTime": "",
                "Source": "BookingEye",
                "Comment": "",
                "AffiliateName": "",
                "AffiliateCode": "",
                "CCLink": "",
                "CCNo": "",
                "CCType": "",
                "CCExpiryDate": "",
                "CardHoldersName": "",
                "TaxDeatil": [
                  {
                    "TaxCode": "AA",
                    "TaxName": "VAT @ 12%",
                    "TaxAmount": "96.0000"
                  },
                  {
                    "TaxCode": "LT",
                    "TaxName": "Luxury @ 10%",
                    "TaxAmount": "80.0000"
                  }
                ],
                "RentalInfo": [
                  {
                    "EffectiveDate": "2019-09-26",
                    "PackageCode": "112400000000000001",
                    "PackageName": "European Plan",
                    "RoomTypeCode": "112400000000000001",
                    "RoomTypeName": "Sea View Deluxe Room",
                    "Adult": "4",
                    "Child": "2",
                    "RentPreTax": "550.00",
                    "Rent": "671.00",
                    "Discount": "0.00"
                  },
                  {
                    "EffectiveDate": "2019-09-27",
                    "PackageCode": "112400000000000001",
                    "PackageName": "European Plan",
                    "RoomTypeCode": "112400000000000001",
                    "RoomTypeName": "Sea View Deluxe Room",
                    "Adult": "4",
                    "Child": "2",
                    "RentPreTax": "250.00",
                    "Rent": "305.00",
                    "Discount": "0.00"
                  }
                ],
                "Sharer": [               
                {
                    "Salutation": "Ms.",
                    "FirstName": "Test",
                    "LastName": "One",
                    "Gender": "Female",
                    "DateOfBirth": "",
                    "SpouseDateOfBirth": "",
                    "WeddingAnniversary": "",
                    "Address": "",
                    "City": " Brockway",
                    "State": "CA",
                    "Country": "USA",
                    "Nationality": "Malta",
                    "Zipcode": "95730",
                    "Phone": "",
                    "Mobile": "3534",
                    "Fax": "564564",
                    "Email": "LarryLForney@rhyta.com",
                    "RegistrationNo" : "",  
                    "IdentityTypeID": "894300000000000003",
                    "IdentityNo": "12345667765",
                    "ExpiryDate": "",
                  },
                  {
                    "Salutation": "Ms.",
                    "FirstName": "Test",
                    "LastName": "Two",
                    "Gender": "Female",
                    "DateOfBirth": "",
                    "SpouseDateOfBirth": "",
                    "WeddingAnniversary": "",
                    "Address": "",
                    "City": " Brockway",
                    "State": "CA",
                    "Country": "USA",
                    "Nationality": "Malta",
                    "Zipcode": "95730",
                    "Phone": "",
                    "Mobile": "3534",
                    "Fax": "564564",
                    "Email": "LarryLForney@rhyta.com",
                    "Registration No" : "",  
                    "IdentityTypeID": "894300000000000003",
                    "IdentityNo": "12345667765",
                    "ExpiryDate": "",
                  }
                ]
              }
            ],
            "LocationId": "1124",
            "UniqueID": "11241254",
            "BookedBy": "BookingEye",
            "Salutation": "Ms.",
            "FirstName": "Hae ",
            "LastName": " Giles ",
            "Gender": "Female",
            "Address": " Garfield Road ",
            "City": "Peoria",
            "State": " Peoria ",
            "Country": "IL",
            "Zipcode": "61614",
            "Phone": "",
            "Mobile": "3534",
            "Fax": "564564",
            "Email": "HaeWGiles@jourrapide.com",
            "Source": "BookingEye",
            "PaymentMethod": "Cash",
            "IsChannelBooking": "1"
          }
        ]
      }
    }
     
    2.Multiple booking :

    {
      "Reservations": {
        "Reservation": [
          {
            "BookingTran": [
              {
                "SubBookingId": "11241254",
                "TransactionId": "112400000000001902",
                "Createdatetime": "2019-09-04 11:40:30",
                "Modifydatetime": "2019-09-04 11:40:30",
                "Status": "New",
                "IsConfirmed": "1",
                "VoucherNo": "single1276/1",
                "PackageCode": "112400000000000001",
                "PackageName": "European Plan",
                "RateplanCode": "112400000000000001",
                "RateplanName": "Sea View Deluxe Room",
                "RoomTypeCode": "112400000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Start": "2019-09-26",
                "End": "2019-09-28",
                "ArrivalTime": "12:00:00",
                "DepartureTime": "11:00:00",
                "CurrencyCode": "USD",
                "TotalAmountAfterTax": "976.00",
                "TotalAmountBeforeTax": "800.00",
                "TotalTax": "176.00",
                "TotalDiscount": "0.00",
                "TotalExtraCharge": "0.00",
                "TotalPayment": "0.00",
                "TACommision": "0.00",
                "Salutation": "Ms.",
                "FirstName": "Lilly",
                "LastName": "Harper",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": " Peoria ",
                "State": "Peoria",
                "Country": "IL",
                "Nationality": "Malta",
                "Zipcode": "61614",
                "Phone": "",
                "Mobile": "3534",
                "Fax": "564564",
                "Email": "LillyJHarper@jourrapide.com",
                "RegistrationNo" : "", 
                "IdentiyType": "Pan card",
                "IdentityNo": "12345667765",
                "ExpiryDate": "",
                "TransportationMode": "",
                "Vehicle": "car",
                "PickupDate": "",
                "PickupTime": "",
                "Source": "BookingEye",
                "Comment": "",
                "AffiliateName": "",
                "AffiliateCode": "",
                "CCLink": "",
                "CCNo": "",
                "CCType": "",
                "CCExpiryDate": "",
                "CardHoldersName": "",
                "TaxDeatil": [
                  {
                    "TaxCode": "AA",
                    "TaxName": "VAT @ 12%",
                    "TaxAmount": "96.0000"
                  },
                  {
                    "TaxCode": "LT",
                    "TaxName": "Luxury @ 10%",
                    "TaxAmount": "80.0000"
                  }
                ],
                "RentalInfo": [
                  {
                    "EffectiveDate": "2019-09-26",
                    "PackageCode": "112400000000000001",
                    "PackageName": "European Plan",
                    "RoomTypeCode": "112400000000000001",
                    "RoomTypeName": "Sea View Deluxe Room",
                    "Adult": "4",
                    "Child": "2",
                    "RentPreTax": "550.00",
                    "Rent": "671.00",
                    "Discount": "0.00"
                  },
                  {
                    "EffectiveDate": "2019-09-27",
                    "PackageCode": "112400000000000001",
                    "PackageName": "European Plan",
                    "RoomTypeCode": "112400000000000001",
                    "RoomTypeName": "Sea View Deluxe Room",
                    "Adult": "4",
                    "Child": "2",
                    "RentPreTax": "250.00",
                    "Rent": "305.00",
                    "Discount": "0.00"
                  }
                ]
              }
            ],
             "LocationId": "1124",
            "UniqueID": "11241254",
            "BookedBy": "BookingEye",
            "Salutation": "Ms.",
            "FirstName": "Hae ",
            "LastName": " Giles ",
            "Gender": "Female",
            "Address": " Garfield Road ",
            "City": "Peoria",
            "State": " Peoria ",
            "Country": "IL",
            "Zipcode": "61614",
            "Phone": "",
            "Mobile": "3534",
            "Fax": "564564",
            "Email": "HaeWGiles@jourrapide.com",
            "Source": "BookingEye",
            "PaymentMethod": "Cash",
            "IsChannelBooking": "1" 
          },
          {
            "BookingTran": [
              {
                "SubBookingId": "11241255",
                "TransactionId": "123450000000001903",
                "Createdatetime": "2019-09-10 11:31:57",
                "Modifydatetime": "2019-09-10 11:31:57",
                "Status": "New",
                "IsConfirmed": "1",
                "CurrentStatus": "Arrived",
                "VoucherNo": "",
                "PackageCode": "12340000000000001",
                "PackageName": "European Plan",
                "RateplanCode": "123450000000000001",
                "RateplanName": "Sea View Deluxe Room",
                "RoomTypeCode": "123450000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Start": "2019-09-11",
                "End": "2019-09-12",
                "ArrivalTime": "12:00:00",
                "DepartureTime": "11:00:00",
                "CurrencyCode": "USD",
                "TotalAmountAfterTax": "6832.00",
                "TotalAmountBeforeTax": "5600.00",
                "TotalTax": "1232.00",
                "TotalDiscount": "0.00",
                "TotalExtraCharge": "0.00",
                "TotalPayment": "0.00",
                "TACommision": "0.00",
                "Salutation": "Dr.",
                "FirstName": "Ellen",
                "LastName": "Novak",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": "",
                "State": "",
                "Country": "",
                "Nationality": "",
                "Zipcode": "",
                "Phone": "",
                "Mobile": "+123 456 7890",
                "Fax": "",
                "Email": "EllenDNovak@dayrep.com",
                "RegistrationNo" : "", 
                "IdentiyType": "",
                "IdentityNo": "",
                "ExpiryDate": "",
                "TransportationMode": "",
                "Vehicle": "",
                "PickupDate": "",
                "PickupTime": "",
                "Source": "Internet Booking Engine",
                "Comment": "",
                "AffiliateName": "",
                "AffiliateCode": "",
                "CCLink": "",
                "CCNo": "",
                "CCType": "",
                "CCExpiryDate": "",
                "CardHoldersName": "",
                "TaxDeatil": [
                  {
                    "TaxCode": "AA",
                    "TaxName": "VAT @ 12%",
                    "TaxAmount": "672.0000"
                  },
                  {
                    "TaxCode": "LT",
                    "TaxName": "Luxury @ 10%",
                    "TaxAmount": "560.0000"
                  }
                ],
                "RentalInfo": [
                  {
                    "EffectiveDate": "2019-09-11",
                    "PackageCode": "123450000000000001",
                    "PackageName": "European Plan",
                    "RoomTypeCode": "123450000000000001",
                    "RoomTypeName": "Sea View Deluxe Room",
                    "Adult": "2",
                    "Child": "0",
                    "RentPreTax": "5600.00",
                    "Rent": "6832.00",
                    "Discount": "0.00"
                  }
                ],
                "Sharer": [               
                 {
                    "Salutation": "Ms.",
                    "FirstName": "Test",
                    "LastName": "One",
                    "Gender": "Female",
                    "DateOfBirth": "",
                    "SpouseDateOfBirth": "",
                    "WeddingAnniversary": "",
                    "Address": "",
                    "City": " Brockway",
                    "State": "CA",
                    "Country": "USA",
                    "Nationality": "Malta",
                    "Zipcode": "95730",
                    "Phone": "",
                    "Mobile": "3534",
                    "Fax": "564564",
                    "Email": "LarryLForney@rhyta.com",
                    "RegistrationNo" : "",  
                    "IdentityTypeID": "894300000000000003",
                    "IdentityNo": "12345667765",
                    "ExpiryDate": "",
                  },
                  {
                    "Salutation": "Ms.",
                    "FirstName": "Test",
                    "LastName": "Two",
                    "Gender": "Female",
                    "DateOfBirth": "",
                    "SpouseDateOfBirth": "",
                    "WeddingAnniversary": "",
                    "Address": "",
                    "City": " Brockway",
                    "State": "CA",
                    "Country": "USA",
                    "Nationality": "Malta",
                    "Zipcode": "95730",
                    "Phone": "",
                    "Mobile": "3534",
                    "Fax": "564564",
                    "Email": "LarryLForney@rhyta.com",
                    "Registration No" : "",  
                    "IdentityTypeID": "894300000000000003",
                    "IdentityNo": "12345667765",
                    "ExpiryDate": "",
                  }
                ]
              }
            ],
            "LocationId": "1234",
            "UniqueID": "11241255",
            "BookedBy": "Internet Booking Engine",
            "Salutation": "Dr.",
            "FirstName": "Audrey",
            "LastName": "Manuel",
            "Gender": "",
            "Address": "",
            "City": "",
            "State": "",
            "Country": "",
            "Zipcode": "",
            "Phone": "",
            "Mobile": "+1234567890",
            "Fax": "",
            "Email": "AudreyJManuel@armyspy.com",
            "Source": "Internet Booking Engine",
            "IsChannelBooking": "0"
          }
        ],
        "CancelReservation": [
          {
            "LocationId": "1234",
            "UniqueID": "11241008-1",
            "Status": "Cancel",
            "Canceldatetime": "2019-05-08 14:21:16",
            "Remark": "Guest want to cancel reservation through Zenrooms",
            "VoucherNo": "100335/1"
          },
          {
            "LocationId": "1234",
            "UniqueID": "11241008-2",
            "Status": "Cancel",
            "Canceldatetime": "2019-05-08 14:21:27",
            "Remark": "Guest want to cancel reservation through Zenrooms",
            "VoucherNo": "100335/2"
          },
          {
            "LocationId": "1234",
            "UniqueID": "11241011",
            "Status": "Cancel",
            "Canceldatetime": "2019-05-08 14:18:57",
            "Remark": "Guest want to cancel reservation through Zenrooms",
            "VoucherNo": "1253911111/2"
          }
        ]
      }
    }

    3.Modify Booking :

    {
      "Reservations": {
        "Reservation": [
          {
            "BookingTran": [
              {
                "SubBookingId": "12345254",
                "TransactionId": "123450000000001902",
                "Createdatetime": "2019-09-04 11:40:30",
                "Modifydatetime": "2019-09-04 11:40:30",
                "Status": "Modify",
                "IsConfirmed": "1",
                "VoucherNo": "single1276/1",
                "PackageCode": "123450000000000001",
                "PackageName": "European Plan",
                "RateplanCode": "112400000000000001",
                "RateplanName": "Sea View Deluxe Room",
                "RoomTypeCode": "123450000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Start": "2019-09-26",
                "End": "2019-09-28",
                "ArrivalTime": "12:00:00",
                "DepartureTime": "11:00:00",
                "CurrencyCode": "USD",
                "TotalAmountAfterTax": "976.00",
                "TotalAmountBeforeTax": "800.00",
                "TotalTax": "176.00",
                "TotalDiscount": "0.00",
                "TotalExtraCharge": "0.00",
                "TotalPayment": "0.00",
                "TACommision": "0.00",
                 "Salutation": "Ms.",
                "FirstName": "Valentina",
                "LastName": "Riter",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": " Peoria ",
                "State": "Peoria",
                "Country": "IL",
                "Nationality": "Malta",
                "Zipcode": "61614", 
                "Phone": "",
                "Mobile": "3534",
                "Fax": "564564",
                "Email": "ValentinaNRiter@jourrapide.com",
                "IdentiyType": "Pan card",
                "IdentityNo": "12345667765",
                "ExpiryDate": "",
                "TransportationMode": "",
                "Vehicle": "car",
                "PickupDate": "",
                "PickupTime": "",
                "Source": "BookingEye",
                "Comment": "",
                "AffiliateName": "",
                "AffiliateCode": "",
                "CCLink": "",
                "CCNo": "",
                "CCType": "",
                "CCExpiryDate": "",
                "CardHoldersName": "",
                "TaxDeatil": [
                  {
                    "TaxCode": "AA",
                    "TaxName": "VAT @ 12%",
                    "TaxAmount": "96.0000"
                  },
                  {
                    "TaxCode": "LT",
                    "TaxName": "Luxury @ 10%",
                    "TaxAmount": "80.0000"
                  }
                ],
                "RentalInfo": [
                  {
                    "EffectiveDate": "2019-09-26",
                    "PackageCode": "123450000000000001",
                    "PackageName": "European Plan",
                    "RoomTypeCode": "123450000000000001",
                    "RoomTypeName": "Sea View Deluxe Room",
                    "Adult": "4",
                    "Child": "2",
                    "RentPreTax": "550.00",
                    "Rent": "671.00",
                    "Discount": "0.00"
                  },
                  {
                    "EffectiveDate": "2019-09-27",
                    "PackageCode": "112400000000000001",
                    "PackageName": "European Plan",
                    "RoomTypeCode": "112400000000000001",
                    "RoomTypeName": "Sea View Deluxe Room",
                    "Adult": "4",
                    "Child": "2",
                    "RentPreTax": "250.00",
                    "Rent": "305.00",
                    "Discount": "0.00"
                  }
                ]
              }
            ],
            "LocationId": "1234",
            "UniqueID": "12345254",
            "BookedBy": "BookingEye",
            "Salutation": "Ms.",
            "FirstName": "Valentina",
            "LastName": "Riter",
            "Gender": "Female",
            "Address": "",
            "City": "Charlotte",
            "State": "Charlotte",
            "Country": "NC",
            "Zipcode": "28202",
            "Phone": "",
            "Mobile": "3534",
            "Fax": "564564",
            "Email": "ValentinaNRiter@jourrapide.com",
            "Source": "BookingEye",
            "PaymentMethod": "Cash",
            "IsChannelBooking": "1"
          }
        ]
      }
    }

    4.Cancel Booking :
    {
      "Reservations": {
         "CancelReservation": [
          {
            "LocationId": "xxxx",
            "UniqueID": "12345228-1",
            "Status": "Cancel",
            "Canceldatetime": "2019-08-14 16:33:38",
            "Remark": "",
            "VoucherNo": ""
          },
          {
            "LocationId": "xxxx",
            "UniqueID": "12345228-2",
            "Status": "Cancel",
            "Canceldatetime": "2019-08-14 16:33:24",
            "Remark": "",
            "VoucherNo": ""
          }
        ]
      }
    }

     
     

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters.                                                 |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |

---

### BKG-03 · Retrieve a Booking

**Request\_Type:** `FetchSingleBooking`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #688

*Tags: Open, PMS Connectivity*

This API helps you to fetch booking details for specific booking ID based on Room No, Guest, Identity No, Guest Email, Guest Mobile No, Guest Registration No. The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                     |               |                                        |                    |
|---------------------|---------------|----------------------------------------|--------------------|
| **Name**            | **Data Type** | **Description**                        | **Example**        |
| Request_Type\*      | VARCHAR(100)  | Request Type                           | FetchSingleBooking |
| BookingId\*         | INT(11)       | Reservation No                         | 12345              |
| RoomNo              | VARCHAR(500)  | Room No (It is Optional)               | 101                |
| Guest               | VARCHAR(100)  | Guest Name (It is Optional)            | test               |
| IdentityNo          | VARCHAR(255)  | Identity No (It is Optional)           | ASD43543           |
| GuestEmail          | VARCHAR(255)  | Guest Email (It is Optional)           | abc@gmail.com      |
| GuestMobileNo       | VARCHAR(255)  | Guest Mobile No (It is Optional)       | XXXXXXXXXX         |
| GuestRegistrationNo | VARCHAR(255)  | Guest Registration No (It is Optional) | XXXXXX             |
| HotelCode\*         | INT(11)       | Unique Hotel code                      | xxxx               |
| AuthCode\*          | VARCHAR(300)  | Unique Authentication code             | xxxxxxxxxx         |

**Request **

``` json
{           
      "RES_Request": {
            "Request_Type": "FetchSingleBooking",
.           "BookingId": "12345",            
            "RoomNo": "101",
            "Guest": "Joy T. Mnewy",          
            "IdentityNo": "ASD43543",              
            "GuestEmail": "XXXXXX@gmail.com",              
            "GuestMobileNo": "XXXXXXXXXX",  
            "GuestRegistrationNo": "XXXXXX", 
            "Authentication": {
                 "HotelCode": "XXXX",
                 "AuthCode": "XXXXXXXXXXXXXXXXXXX"
           } 
      }
}
 
```

**Response**

|                                                                                                                             |               |                                                                                                                                                                                                                                                                                          |                                         |
|-----------------------------------------------------------------------------------------------------------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| **Name**                                                                                                                    | **Data Type** | **Description**                                                                                                                                                                                                                                                                          | **Example**                             |
| LocationId                                                                                                                  | INT(11)       | Hotel code                                                                                                                                                                                                                                                                               | xxxx                                    |
| UniqueID                                                                                                                    | VARCHAR(255)  | Unique Booking id/ Reservation No                                                                                                                                                                                                                                                        | 10125, 86436, B4525 etc                 |
| BookedBy                                                                                                                    | VARCHAR(255)  | Information regarding Booked by                                                                                                                                                                                                                                                          | Booking.com etc                         |
| Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo. | VARCHAR(255)  | Here \* denotes guest information like Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo.                                                                                                                       | shown in JSON response below.           |
| Source                                                                                                                      | VARCHAR(1000) | Booking generated source                                                                                                                                                                                                                                                                 | Booking.com etc                         |
| PaymentMethod                                                                                                               | VARCHAR(255)  | Payment Mode selected by guest                                                                                                                                                                                                                                                           | Cash, Credit, CityLedger etc            |
| IsChannelBooking                                                                                                            | INT(1)        | Is booking comes from channel \[0 or 1\]1 : Booking from the channel.0: Booking not from the channel.                                                                                                                                                                                    | 0 or 1                                  |
| BookingTran. SubBookingId                                                                                                   | VARCHAR(255)  | Sub booking Id                                                                                                                                                                                                                                                                           | 138                                     |
| BookingTran. TransactionId                                                                                                  | INT(20)       | Booking Transaction ID                                                                                                                                                                                                                                                                   | 112500000000000163                      |
| BookingTran. Status                                                                                                         | VARCHAR(100)  | Booking Status                                                                                                                                                                                                                                                                           | New or Modify or Cancel.                |
| BookingTran.IsConfirmed                                                                                                     | INT(1)        | Booking Confirmation Flag. \[1 or 0\]1 : Confirmed0 : Not Confirmed                                                                                                                                                                                                                      | 1 or 0.                                 |
| BookingTran.CurrentStatus                                                                                                   | VARCHAR(100)  | Booking Current Status                                                                                                                                                                                                                                                                   | Arrived, Checked Out, Cancel, Void, etc |
| BookingTran.VoucherNo                                                                                                       | VARCHAR(255)  | Booking Voucher No                                                                                                                                                                                                                                                                       | 10203049/8512                           |
| BookingTran. PackageCode                                                                                                    | INT(20)       | Package Code                                                                                                                                                                                                                                                                             | 112500000000000001                      |
| BookingTran. PackageName                                                                                                    | VARCHAR(1000) | Package Name                                                                                                                                                                                                                                                                             | European Plan etc                       |
| BookingTran. RateplanCode                                                                                                   | INT(20)       | Unique RatePlan Code                                                                                                                                                                                                                                                                     | 112500000000000006                      |
| BookingTran. RateplanName                                                                                                   | STRING(1000)  | RatePlan Name                                                                                                                                                                                                                                                                            | Grand Sea View Junior Suite             |
| BookingTran. RoomTypeCode                                                                                                   | INT(20)       | Unique RoomType Code                                                                                                                                                                                                                                                                     | 112500000000000006                      |
| BookingTran. RoomTypeName                                                                                                   | STRING(1000)  | RoomType Name                                                                                                                                                                                                                                                                            | Garden View Studio Room                 |
| BookingTran.RoomID                                                                                                          | INT(20)       | Unique RoomID                                                                                                                                                                                                                                                                            | 112500000000000001                      |
| BookingTran. RoomName                                                                                                       | STRING(1000)  | Room Name                                                                                                                                                                                                                                                                                | 101                                     |
| BookingTran. Start                                                                                                          | DATE          | Check-in date\[Format : yyyy-mm-dd\]                                                                                                                                                                                                                                                     | 2017-12-25                              |
| BookingTran. End                                                                                                            | DATE          | Check-out date \[Format : yyyy-mm-dd\]                                                                                                                                                                                                                                                   | 2017-12-27                              |
| BookingTran.TotalRate                                                                                                       | DECIMAL(19,4) | Rate on room in amount                                                                                                                                                                                                                                                                   | 1500.43                                 |
| BookingTran.                                                                                                                | DECIMAL(19,4) | Discount on room in                                                                                                                                                                                                                                                                      | 500                                     |
| TotalDiscount                                                                                                               |               | Amount                                                                                                                                                                                                                                                                                   |                                         |
| BookingTran. TotalExtraCharge                                                                                               | DECIMAL(19,4) | Extra charges in amount(if any)                                                                                                                                                                                                                                                          | 300                                     |
| BookingTran.\*                                                                                                              | –             | Here \* denotes guest informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityType, IdentityNo, ExpiryDate.                |                                         |
| BookingTran. TransportationMode                                                                                             | VARCHAR(100)  | Mode of transportation                                                                                                                                                                                                                                                                   | Bus, car etc                            |
| BookingTran. Vehicle                                                                                                        | VARCHAR(255)  | Detail of vehicle                                                                                                                                                                                                                                                                        |                                         |
| BookingTran. PickupDate                                                                                                     | DATE          | Pickup date\[Format : yyyy-mm-dd\]                                                                                                                                                                                                                                                       | 2017-12-25 etc                          |
| BookingTran. PickupTime                                                                                                     | TIME          | Pickup time                                                                                                                                                                                                                                                                              |                                         |
| BookingTran. Source                                                                                                         | VARCHAR(1000) | Booking generated source                                                                                                                                                                                                                                                                 | [Booking.com](http://booking.com/)      |
| BookingTran. Comment                                                                                                        | VARCHAR(1000) | Additional Information or comment.                                                                                                                                                                                                                                                       |                                         |
| BookingTran. AffiliateName                                                                                                  | VARCHAR(1000) | Booking Affiliate Name                                                                                                                                                                                                                                                                   |                                         |
| BookingTran.AffiliateCode                                                                                                   | VARCHAR(1000) | Booking Affiliate Code                                                                                                                                                                                                                                                                   |                                         |
| BookingTran.\*                                                                                                              | –             | Here \* denotes Credit Card Informations like CCLink, CCNo, CCType, CardHolderName, CCExpiryDate,                                                                                                                                                                                        | CCLink in encoded with base64_encode.   |
| BookingTran.RentalInfo.RoomID                                                                                               | INT(20)       | Unique RoomID                                                                                                                                                                                                                                                                            | 112500000000000001                      |
| BookingTran.RentalInfo. RoomName                                                                                            | STRING(1000)  | Room Name                                                                                                                                                                                                                                                                                | 101                                     |
| BookingTran.RentalInfo.EffectiveDate                                                                                        | DATETIME      | Booking details for particular effective date                                                                                                                                                                                                                                            | 2017-12-25 etc                          |
| BookingTran.RentalInfo.PackageCode                                                                                          | INT(20)       | Package code                                                                                                                                                                                                                                                                             | 112500000000000001                      |
| BookingTran.RentalInfo.PackageName                                                                                          | VARCHAR(1000) | Package Name                                                                                                                                                                                                                                                                             | European Plan                           |
| BookingTran.RentalInfo.RoomTypeCode                                                                                         | INT(20)       | Unique RoomType Code                                                                                                                                                                                                                                                                     | 112500000000000006                      |
| BookingTran.RentalInfo.RoomTypeName                                                                                         | STRING(1000)  | RoomType Name                                                                                                                                                                                                                                                                            | Grand Sea View Junior Suite             |
| BookingTran.RentalInfo.Adult                                                                                                | INT(11)       | No. of Adults                                                                                                                                                                                                                                                                            | 2,3,4 etc                               |
| BookingTran. RentalInfo.Child                                                                                               | INT(11)       | No. of Childs                                                                                                                                                                                                                                                                            | 2,3,4 etc                               |
| BookingTran. RentalInfo.Rent                                                                                                | DECIMAL(19,4) | Room rental amount                                                                                                                                                                                                                                                                       | 1500.43                                 |
| BookingTran. RentalInfo.Discount                                                                                            | DECIMAL(19,4) | Discount on rental room in amount                                                                                                                                                                                                                                                        | 500                                     |
| BookingTran.Sharer.\*                                                                                                       | –             | Here \* denotes Sharer informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Nationality,Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityTypeID, IdentityNo, ExpiryDate. |                                         |
| Errors.ErrorCode                                                                                                            | –             | Response Error Code                                                                                                                                                                                                                                                                      | 104, 404 etc                            |
| Errors.ErrorMessage                                                                                                         | –             | Generate Response Message                                                                                                                                                                                                                                                                | Unauthorized Request. etc               |

**Success**

``` json
{
  "Reservations": {
    "Reservation": [
      {
        "BookingTran": [
          {
            "SubBookingId": "11241254",
            "TransactionId": "112400000000001902",
            "Createdatetime": "2019-09-04 11:40:30",
            "Modifydatetime": "2019-09-04 11:40:30",
            "Status": "New",
            "IsConfirmed": "1",
            "CurrentStatus": "Arrived",
            "VoucherNo": "single1276/1",
            "PackageCode": "112400000000000001",
            "PackageName": "European Plan",
            "RateplanCode": "112400000000000001",
            "RateplanName": "Sea View Deluxe Room",
            "RoomTypeCode": "112400000000000001",
            "RoomTypeName": "Sea View Deluxe Room",
            "RoomID": "112400000000000001",           
            "RoomName": "101",
            "Start": "2019-09-26",
            "End": "2019-09-28",
            "ArrivalTime": "12:00:00",
            "DepartureTime": "11:00:00",
            "CurrencyCode": "USD",
            "TotalAmountAfterTax": "976.00",
            "TotalAmountBeforeTax": "800.00",
            "TotalTax": "176.00",
            "TotalDiscount": "0.00",
            "TotalExtraCharge": "0.00",
            "TotalPayment": "0.00",
            "TACommision": "0.00",
            "Salutation": "Ms.",
            "FirstName": "Test",
            "LastName": "One",
            "Gender": "Female",
            "DateOfBirth": "",
            "SpouseDateOfBirth": "",
            "WeddingAnniversary": "",
            "Address": "",
            "City": " Brockway",
            "State": "CA",
            "Country": "USA",
            "Nationality": "Malta",
            "Zipcode": "95730",
            "Phone": "",
            "Mobile": "3534",
            "Fax": "564564",
            "Email": "LarryLForney@rhyta.com",
            “RegistrationNo” : "", 
            "IdentityType": "Pan card",
            "IdentityNo": "12345667765",
            "ExpiryDate": "",
            "TransportationMode": "",
            "Vehicle": "car",
            "PickupDate": "",
            "PickupTime": "",
            "Source": "BookingEye",
            "Comment": "",
            "AffiliateName": "",
            "AffiliateCode": "",
            "CCLink": "",
            "CCNo": "",
            "CCType": "",
            "CCExpiryDate": "",
            "CardHoldersName": "",
            "TaxDeatil": [
              {
                "TaxCode": "AA",
                "TaxName": "VAT @ 12%",
                "TaxAmount": "96.0000"
              },
              {
                "TaxCode": "LT",
                "TaxName": "Luxury @ 10%",
                "TaxAmount": "80.0000"
              }
            ],
            "RentalInfo": [
              {
                "RoomID": "112400000000000001",   
                "RoomName": "101",
                "EffectiveDate": "2019-09-26",
                "PackageCode": "112400000000000001",
                "PackageName": "European Plan",
                "RoomTypeCode": "112400000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Adult": "4",
                "Child": "2",
                "RentPreTax": "550.00",
                "Rent": "671.00",
                "Discount": "0.00"
              },
              {
                 "RoomID": "112400000000000001",   
                 "RoomName": "101",
                "EffectiveDate": "2019-09-27",
                "PackageCode": "112400000000000001",
                "PackageName": "European Plan",
                "RoomTypeCode": "112400000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Adult": "4",
                "Child": "2",
                "RentPreTax": "250.00",
                "Rent": "305.00",
                "Discount": "0.00"
              }
            ],
        "Sharer": [               
               {
                "Salutation": "Ms.",
                "FirstName": "Test",
                "LastName": "One",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": " Brockway",
                "State": "CA",
                "Country": "USA",
                "Nationality": "Malta",
                "Zipcode": "95730",
                "Phone": "",
                "Mobile": "3534",
                "Fax": "564564",
                "Email": "LarryLForney@rhyta.com",
                "RegistrationNo" : "",  
                "IdentityTypeID": "894300000000000003",
                "IdentityNo": "12345667765",
                "ExpiryDate": "",
              },
              {
                "Salutation": "Ms.",
                "FirstName": "Test",
                "LastName": "One",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": " Brockway",
                "State": "CA",
                "Country": "USA",
                "Nationality": "Malta",
                "Zipcode": "95730",
                "Phone": "",
                "Mobile": "3534",
                "Fax": "564564",
                "Email": "LarryLForney@rhyta.com",
                "Registration No" : "",  
                "IdentityTypeID": "894300000000000003",
                "IdentityNo": "12345667765",
                "ExpiryDate": "",
              }
            ] 
          }
        ],
        "LocationId": "1124",
        "UniqueID": "11241254",
        "BookedBy": "BookingEye",
        "Salutation": "Ms.",
        "FirstName": "Larry",
        "LastName": "Forney",
        "Gender": "Female",
        "Address": "",
        "City": "Brockway",
        "State": "CA",
        "Country": "USA",
        "Zipcode": "95730",
        "Phone": "",
        "Mobile": "3534",
        "Fax": "564564",
        "Email": "LarryLForney@rhyta.com",
        "Source": "BookingEye",
        "PaymentMethod": "Cash",
        "IsChannelBooking": "1"
      }
    ]
  }
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters.                                                 |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 212            | Missing Parameter OR Invalid Parameter                                       |
| 213            | Parameter is blank                                                           |

---

### BKG-04 · Booking Received Notification

**Request\_Type:** `BookingRecdNotification`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #692

*Tags: PMS Connectivity*

You should strive to process new, modified, and canceled reservations almost instantly (see [Retrieve all Bookings](https://api.ezeetechnosys.com/#681)). This API is used to notify our system, that you have received bookings.

The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                 |               |                                       |                     |
|-----------------|---------------|---------------------------------------|---------------------|
| **Name**        | **Data Type** | **Description**                       | **Example**         |
| Request_Type \* | –             | Use Keyword “BookingRecdNotification” |                     |
| HotelCode \*    | INT(11)       | Unique Hotel code                     | XXXX                |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code            | XXXXXXXXXX          |
| BookingId \*    | VARCHAR(20)   | Unique BookingId                      | 1234, RV123,G872    |
| PMS_BookingId\* | VARCHAR(20)   | Third party PMS Unique ID             | 1234, RV123,G872    |
| Status          | VARCHAR(20)   | Booking Status (Optional)             | New, Modify, Cancel |

**Request **

``` json
 {
 "RES_Request": {
 "Request_Type": "BookingRecdNotification",
 "Authentication": {
        "HotelCode": "xxxx",
        "AuthCode": "xxxxxxxxxxxx"
      },
    "Bookings": {
           "Booking": [
            {
                "BookingId": "12345",
                 "PMS_BookingId": "123456",
                 "Status": "New"
             },
             {
                 "BookingId": "4321",
                 "PMS_BookingId": "45678",
                 "Status": "Cancel"
              }
            ]
       }
 }
}
```

**Response**

|                     |               |                                   |                                                                       |
|---------------------|---------------|-----------------------------------|-----------------------------------------------------------------------|
| **Name**            | **Data Type** | **Description**                   | **Example**                                                           |
| Success.SuccessMsg  | –             | Generate Success Response Message | 2 booking(s) updated                                                  |
| Errors.ErrorCode    | –             | Response Error Code               | 0, 301 etc                                                            |
| Errors.ErrorMessage | –             | Generate Response Message         | Unauthorized Request. Please check hotel code and authentication code |

**Success**

``` json
 {
    "Success": {
        "SuccessMsg": "2 booking(s) updated"
     },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
     }
} 
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters.                                                 |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 117            | Booking id(s) missing in booking received notification request               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 118            | Booking id(s) missing in booking received notification request               |

---

### BKG-05 · Retrieve Arrivals

**Request\_Type:** `ArrivalList`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #695

*Tags: Kiosk Connectivity, Open, Regional Portal*

This API provides guest arrival information based on arrival dates of bookings. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                     |               |                                        |                   |
|---------------------|---------------|----------------------------------------|-------------------|
| **Name**            | **Data Type** | **Description**                        | **Example**       |
| Request_Type \*     | VARCHAR(250)  | Use Keyword “ArrivalList”              |                   |
| BookingId           | INT(11)       | Reservation No (It is Optional)        | 12345             |
| RoomNo              | VARCHAR(500)  | Room No (It is Optional)               | 101               |
| Guest               | VARCHAR(100)  | Guest Name (It is Optional)            | test              |
| IdentityNo          | VARCHAR(255)  | Identity No (It is Optional)           | ASD43543          |
| GuestEmail          | VARCHAR(255)  | Guest Email (It is Optional)           | abc@gmail.com     |
| GuestMobileNo       | VARCHAR(255)  | Guest Mobile No (It is Optional)       | XXXXXXXXXX        |
| GuestRegistrationNo | VARCHAR(255)  | Guest Registration No (It is Optional) | XXXXXX            |
| HotelCode \*        | INT(11)       | Unique Hotel code                      | XXXX              |
| AuthCode \*         | VARCHAR(300)  | Unique Authentication code             | XXXXXXXXXXXXXXXXX |
| from_date \*        | DATE          | To send a from date                    | 2020-06-05        |
| to_date \*          | DATE          | To send a to date                      | 2020-07-07        |

**Request **

``` json
{
    "RES_Request": {
    "Request_Type": "ArrivalList",
    "BookingId": "12345",
    "RoomNo": "101",
    "Guest": "Joy T. Mnewy",
    "IdentityNo": "ASD43543",
    "GuestEmail": "XXXXXX@gmail.com",
    "GuestMobileNo": "XXXXXXXXXX",
    "GuestRegistrationNo": "XXXXXX",    
    "Authentication": {
      "HotelCode": "xxxx",
      "AuthCode": "xxxxxxxxxxxxxxxxxxxxxxx"
    },
    "Date": {
    "from_date": "2020-04-05",
    "to_date": "2020-04-07"
    }
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>LocationId</td>
<td>INT(11)</td>
<td>Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>UniqueID</td>
<td>VARCHAR(255)</td>
<td>Unique Booking id</td>
<td>10125, 86436,<br />
B4525 etc</td>
</tr>
<tr class="even">
<td>BookedBy</td>
<td>VARCHAR(255)</td>
<td>Information regarding Booked by</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo.</td>
<td>VARCHAR(255)</td>
<td>Here * denotes guest information like Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo.</td>
<td>shown in JSON response below.</td>
</tr>
<tr class="even">
<td>Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>PaymentMethod</td>
<td>VARCHAR(255)</td>
<td>Payment Mode selected by guest</td>
<td>Cash, Credit, CityLedger etc</td>
</tr>
<tr class="even">
<td>IsChannelBooking</td>
<td>INT(1)</td>
<td>Is booking comes from channel [0 or 1]<br />
1 : Booking from the channel.<br />
0: Booking not from the channel.</td>
<td>0 or 1</td>
</tr>
<tr class="odd">
<td>BookingTran. SubBookingId</td>
<td>VARCHAR(255)</td>
<td>Sub booking Id</td>
<td>138</td>
</tr>
<tr class="even">
<td>BookingTran. TransactionId</td>
<td>INT(20)</td>
<td>Booking Transaction ID</td>
<td>123400000000000163</td>
</tr>
<tr class="odd">
<td>BookingTran. Status</td>
<td>VARCHAR(100)</td>
<td>Booking Status</td>
<td>New or Modify or Cancel.</td>
</tr>
<tr class="even">
<td>BookingTran.IsConfirmed</td>
<td>INT(1)</td>
<td>Booking Confirmation Flag. [1 or 0]<br />
1 : Confirmed<br />
0 : Not Confirmed</td>
<td>1 or 0.</td>
</tr>
<tr class="odd">
<td>BookingTran. CurrentStatus</td>
<td>VARCHAR(100)</td>
<td>Booking Current Status</td>
<td>Arrived, Checked Out, Cancel, Void, etc</td>
</tr>
<tr class="even">
<td>BookingTran. VoucherNo</td>
<td>VARCHAR(255)</td>
<td>Booking Voucher No</td>
<td>10203049/8512</td>
</tr>
<tr class="odd">
<td>BookingTran. PackageCode</td>
<td>INT(20)</td>
<td>Package Code</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>BookingTran. PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RateplanCode</td>
<td>INT(20)</td>
<td>Unique RatePlan Code</td>
<td>123400000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RateplanName</td>
<td>STRING(1000)</td>
<td>RatePlan Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran. RoomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>123400000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RoomTypeName</td>
<td>STRING(1000)</td>
<td>RoomType Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="odd">
<td>BookingTran. Start</td>
<td>DATE</td>
<td>Check-in date[Format : yyyy-mm-dd]</td>
<td>2020-10-25</td>
</tr>
<tr class="even">
<td>BookingTran. End</td>
<td>DATE</td>
<td>Check-out date [Format : yyyy-mm-dd]</td>
<td>2020-10-27</td>
</tr>
<tr class="odd">
<td>BookingTran.TotalRate</td>
<td>DECIMAL(19,4)</td>
<td>Rate on room in amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran.</td>
<td>DECIMAL(19,4)</td>
<td>Discount on room in</td>
<td>500</td>
</tr>
<tr class="odd">
<td>TotalDiscount</td>
<td></td>
<td>Amount</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran. TotalExtraCharge</td>
<td>DECIMAL(19,4)</td>
<td>Extra charges in amount(if any)</td>
<td>300</td>
</tr>
<tr class="odd">
<td>BookingTran. TotalPayment</td>
<td>DECIMAL(19,4)</td>
<td>Payment for room in amount</td>
<td>2500.54</td>
</tr>
<tr class="even">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes guest informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityType, IdentityNo, ExpiryDate.</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. TransportationMode</td>
<td>VARCHAR(100)</td>
<td>Mode of transportation</td>
<td>Bus, car etc</td>
</tr>
<tr class="even">
<td>BookingTran. Vehicle</td>
<td>VARCHAR(255)</td>
<td>Detail of vehicle</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. PickupDate</td>
<td>DATE</td>
<td>Pickup date[Format : yyyy-mm-dd]</td>
<td>2020-10-25 etc</td>
</tr>
<tr class="even">
<td>BookingTran. PickupTime</td>
<td>TIME</td>
<td>Pickup time</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Booking.com</td>
</tr>
<tr class="even">
<td>BookingTran. Comment</td>
<td>VARCHAR(1000)</td>
<td>Additional Information or comment.</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. AffiliateName</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Name</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran.AffiliateCode</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Code</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes Credit Card Informations like CCLink, CCNo, CCType,CardHolderName, CCExpiryDate,</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.EffectiveDate</td>
<td>DATETIME</td>
<td>Booking details for particular effective date</td>
<td>2020-10-25 etc</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.PackageCode</td>
<td>INT(20)</td>
<td>Package code</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.PackageName</td>
<td>VARCHAR(100)</td>
<td>Package Name</td>
<td>European Plan</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.<br />
RoomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>123400000000000006</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.<br />
RoomTypeName</td>
<td>STRING(100)</td>
<td>RoomType Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.Adult</td>
<td>INT(11)</td>
<td>No. of Adults</td>
<td>2,3,4 etc</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Child</td>
<td>INT(11)</td>
<td>No. of Childs</td>
<td>2,3,4 etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RentalInfo.Rent</td>
<td>DECIMAL(19,4)</td>
<td>Room rental amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Discount</td>
<td>DECIMAL(19,4)</td>
<td>Discount on rental room in amount</td>
<td>500</td>
</tr>
<tr class="odd">
<td>BookingTran.Sharer.*</td>
<td>–</td>
<td>Here * denotes Sharer informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Nationality,Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityTypeID, IdentityNo, ExpiryDate.</td>
<td></td>
</tr>
<tr class="even">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>104, 404 etc</td>
</tr>
<tr class="odd">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Unauthorized Request. etc</td>
</tr>
</tbody>
</table>

**Success**

``` json
{
"Reservations": {
     "Reservation": [
         {
             "BookingTran": [
                 {
                     "SubBookingId": "RES2370",
                     "TransactionId": "123400000000003428",
                     "Createdatetime": "2020-01-21 12:10:58",
                     "Modifydatetime": "2020-01-21 12:10:58",
                     "Status": "New",                     
                     "IsConfirmed": "1",
                     "CurrentStatus": "Arrived",
                     "VoucherNo": "",
                     "PackageCode": "123400000000000012",
                     "PackageName": "GV",
                     "RateplanCode": "123400000000000051",
                     "RateplanName": "Govt GV",
                     "RoomTypeCode": "123400000000000035",
                     "RoomTypeName": "Govt",
                     "Start": "2020-04-07",
                     "End": "2020-04-08",
                     "ArrivalTime": "12:10:00",
                     "DepartureTime": "12:10:00",
                     "CurrencyCode": "RS",
                     "TotalAmountAfterTax": "1356.00",
                     "TotalAmountBeforeTax": "1200.00",
                     "TotalTax": "156.00",
                     "TotalDiscount": "0.00",
                     "TotalExtraCharge": "0.00",
                     "TotalPayment": "580.00",
                     "TACommision": "0.00",
                     "Salutation": "Dr.",
                     "FirstName": "Maxwel",
                     "LastName": "Phil",
                     "Gender": "Male",
                     "DateOfBirth": "",
                     "SpouseDateOfBirth": "",
                     "WeddingAnniversary": "",
                     "Address": "",
                     "City": "",
                     "State": "",
                     "Country": "Romania",
                     "Nationality": "India",
                     "Zipcode": "",
                     "Phone": "",
                     "Mobile": "",
                     "Fax": "",
                     "Email": "",
                     “RegistrationNo” : "",                      
                     "IdentiyType": "",
                     "IdentityNo": "",
                     "ExpiryDate": "",
                     "TransportationMode": "",
                     "Vehicle": "",
                     "PickupDate": "",
                     "PickupTime": "",
                     "Source": "WEB",
                     "Comment": "",
                     "AffiliateName": "",
                     "AffiliateCode": "",
                     "CCLink": "",
                     "CCNo": "",
                     "CCType": "",
                     "CCExpiryDate": "",
                     "CardHoldersName": "",
                     "TaxDeatil": [
                         {
                             "TaxCode": "PDV 13%",
                             "TaxName": "PDV 13%",
                             "TaxAmount": "156.0000"
                         }
                     ],
                     "RentalInfo": [
                         {
                             "EffectiveDate": "2020-10-07",
                             "PackageCode": "123400000000000012",
                             "PackageName": "GV",
                             "RoomTypeCode": "123400000000000035",
                             "RoomTypeName": "Govt",
                             "RoomName": "102",
                             "Adult": "2",
                             "Child": "0",
                             "RentPreTax": "1200.00",
                             "Rent": "1356.00",
                             "Discount": "0.00"
                         }
                     ],
                 "Sharer": [               
                        {
                         "Salutation": "Ms.",
                         "FirstName": "Test",
                         "LastName": "One",
                         "Gender": "Female",
                         "DateOfBirth": "",
                         "SpouseDateOfBirth": "",
                         "WeddingAnniversary": "",
                         "Address": "",
                         "City": " Brockway",
                         "State": "CA",
                         "Country": "USA",
                         "Nationality": "Malta",
                         "Zipcode": "95730",
                         "Phone": "",
                         "Mobile": "3534",
                         "Fax": "564564",
                         "Email": "LarryLForney@rhyta.com",
                         "RegistrationNo" : "",  
                         "IdentityTypeID": "894300000000000003",
                         "IdentityNo": "12345667765",
                         "ExpiryDate": "",
                        },
                       {
                        "Salutation": "Ms.",
                        "FirstName": "Test",
                        "LastName": "One",
                        "Gender": "Female",
                        "DateOfBirth": "",
                        "SpouseDateOfBirth": "",
                        "WeddingAnniversary": "",
                        "Address": "",
                        "City": " Brockway",
                        "State": "CA",
                        "Country": "USA",
                        "Nationality": "Malta",
                        "Zipcode": "95730",
                        "Phone": "",
                        "Mobile": "3534",
                        "Fax": "564564",
                        "Email": "LarryLForney@rhyta.com",
                        "Registration No" : "",  
                        "IdentityTypeID": "894300000000000003",
                        "IdentityNo": "12345667765",
                        "ExpiryDate": "",
                       }
                     ]
                 }
             ],
             "LocationId": "27",
             "UniqueID": "RES2370",
             "BookedBy": "Joy Chistian",
             "Salutation": "Dr.",
             "FirstName": "Joy",
             "LastName": "Chistian",
             "Gender": "Male",
             "Address": "AB-12, Street-2",
             "City": "",
             "State": "",
             "Country": "Romania",
             "Zipcode": "",
             "Phone": "",
             "Mobile": "",
             "Fax": "",
             "Email": "",             
             "Source": "WEB",
             "PaymentMethod": "GreenTop2",
             "IsChannelBooking": "1"
         },
     ]
}
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters.                                                 |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 105            | From Date is missing                                                         |
| 107            | To Date is missing                                                           |
| 109            | Please check From and To date. To Date should be greater than fromdate       |
| 303            | No Data Found.                                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 106            | From Date is not a valid date                                                |
| 108            | To Date is not a valid date                                                  |
| 112            | Error: Date range is too long. Please provide dates for 1 month.             |
| 503            | No Data Found.                                                               |

---

### BKG-06 · Retrieve Departures

**Request\_Type:** `DepartureList`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #699

*Tags: Kiosk Connectivity, Open, Regional Portal*

This API provides guest departures information based on departure dates of bookings. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                     |               |                                        |                   |
|---------------------|---------------|----------------------------------------|-------------------|
| **Name**            | **Data Type** | **Description**                        | **Example**       |
| Request_Type \*     | VARCHAR(250)  | Use Keyword “DepartureList”            |                   |
| BookingId           | INT(11)       | Reservation No (It is Optional)        | 12345             |
| RoomNo              | VARCHAR(500)  | Room No (It is Optional)               | 101               |
| Guest               | VARCHAR(100)  | Guest Name (It is Optional)            | test              |
| IdentityNo          | VARCHAR(255)  | Identity No (It is Optional)           | ASD43543          |
| GuestEmail          | VARCHAR(255)  | Guest Email (It is Optional)           | abc@gmail.com     |
| GuestMobileNo       | VARCHAR(255)  | Guest Mobile No (It is Optional)       | XXXXXXXXXX        |
| GuestRegistrationNo | VARCHAR(255)  | Guest Registration No (It is Optional) | XXXXXX            |
| HotelCode \*        | INT(11)       | Unique Hotel code                      | XXXX              |
| AuthCode \*         | VARCHAR(300)  | Unique Authentication code             | XXXXXXXXXXXXXXXXX |
| from_date \*        | DATE          | To send a from date                    | 2020-06-05        |
| to_date \*          | DATE          | To send a to date                      | 2020-07-07        |

**Request **

``` json
{
    "RES_Request": {
    "Request_Type": "DepartureList",
    "BookingId": "12345",
    "RoomNo": "101",
    "Guest": "Joy T. Mnewy",
    "IdentityNo": "ASD43543",
    "GuestEmail": "XXXXXX@gmail.com",
    "GuestMobileNo": "XXXXXXXXXX",
    "GuestRegistrationNo": "XXXXXX", 
    "Authentication": {
      "HotelCode": "xxxx",
      "AuthCode": "xxxxxxxxxxxxxxxxxxxxxxx"
    },
    "Date": {
    "from_date": "2020-10-05",
    "to_date": "2020-10-07"
    }
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>LocationId</td>
<td>INT(11)</td>
<td>Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>UniqueID</td>
<td>VARCHAR(255)</td>
<td>Unique Booking id</td>
<td>10125, 86436, B4525 etc</td>
</tr>
<tr class="even">
<td>BookedBy</td>
<td>VARCHAR(255)</td>
<td>Information regarding Booked by</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo.</td>
<td>VARCHAR(255)</td>
<td>Here * denotes guest information like Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo.</td>
<td>shown in JSON response below.</td>
</tr>
<tr class="even">
<td>Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>PaymentMethod</td>
<td>VARCHAR(255)</td>
<td>Payment Mode selected by guest</td>
<td>Cash, Credit, CityLedger etc</td>
</tr>
<tr class="even">
<td>IsChannelBooking</td>
<td>INT(1)</td>
<td>Is booking comes from channel [0 or 1]<br />
1 : Booking from the channel.<br />
0: Booking not from the channel.</td>
<td>0 or 1</td>
</tr>
<tr class="odd">
<td>BookingTran. SubBookingId</td>
<td>VARCHAR(255)</td>
<td>Sub booking Id</td>
<td>138</td>
</tr>
<tr class="even">
<td>BookingTran. TransactionId</td>
<td>INT(20)</td>
<td>Booking Transaction ID</td>
<td>123400000000000163</td>
</tr>
<tr class="odd">
<td>BookingTran. Status</td>
<td>VARCHAR(100)</td>
<td>Booking Status</td>
<td>New or Modify or Cancel.</td>
</tr>
<tr class="even">
<td>BookingTran. IsConfirmed</td>
<td>INT(1)</td>
<td>Booking Confirmation Flag. [1 or 0]<br />
1 : Confirmed<br />
0 : Not Confirmed</td>
<td>1 or 0.</td>
</tr>
<tr class="odd">
<td>BookingTran. CurrentStatus</td>
<td>VARCHAR(100)</td>
<td>Booking Current Status</td>
<td>Arrived, Checked Out, Cancel, Void, etc</td>
</tr>
<tr class="even">
<td>BookingTran. VoucherNo</td>
<td>VARCHAR(255)</td>
<td>Booking Voucher No</td>
<td>10203049/8512</td>
</tr>
<tr class="odd">
<td>BookingTran. PackageCode</td>
<td>INT(20)</td>
<td>Package Code</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>BookingTran. PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RateplanCode</td>
<td>INT(20)</td>
<td>Unique RatePlan Code</td>
<td>123400000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RateplanName</td>
<td>STRING(1000)</td>
<td>RatePlan Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran. RoomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>123400000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RoomTypeName</td>
<td>STRING(1000)</td>
<td>RoomType Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="odd">
<td>BookingTran. Start</td>
<td>DATE</td>
<td>Check-in date[Format : yyyy-mm-dd]</td>
<td>2020-10-25</td>
</tr>
<tr class="even">
<td>BookingTran. End</td>
<td>DATE</td>
<td>Check-out date [Format : yyyy-mm-dd]</td>
<td>2020-10-27</td>
</tr>
<tr class="odd">
<td>BookingTran.TotalRate</td>
<td>DECIMAL(19,4)</td>
<td>Rate on room in amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran.</td>
<td>DECIMAL(19,4)</td>
<td>Discount on room in</td>
<td>500</td>
</tr>
<tr class="odd">
<td>TotalDiscount</td>
<td><br />
</td>
<td>Amount</td>
<td><br />
</td>
</tr>
<tr class="even">
<td>BookingTran. TotalExtraCharge</td>
<td>DECIMAL(19,4)</td>
<td>Extra charges in amount(if any)</td>
<td>300</td>
</tr>
<tr class="odd">
<td>BookingTran. TotalPayment</td>
<td>DECIMAL(19,4)</td>
<td>Payment for room in amount</td>
<td>2500.54</td>
</tr>
<tr class="even">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes guest informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityType, IdentityNo, ExpiryDate.</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. TransportationMode</td>
<td>VARCHAR(100)</td>
<td>Mode of transportation</td>
<td>Bus, car etc</td>
</tr>
<tr class="even">
<td>BookingTran. Vehicle</td>
<td>VARCHAR(255)</td>
<td>Detail of vehicle</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. PickupDate</td>
<td>DATE</td>
<td>Pickup date[Format : yyyy-mm-dd]</td>
<td>2020-10-25 etc</td>
</tr>
<tr class="even">
<td>BookingTran. PickupTime</td>
<td>TIME</td>
<td>Pickup time</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Booking.com</td>
</tr>
<tr class="even">
<td>BookingTran. Comment</td>
<td>VARCHAR(1000)</td>
<td>Additional Information or comment.</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran. AffiliateName</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Name</td>
<td><br />
</td>
</tr>
<tr class="even">
<td>BookingTran.AffiliateCode</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Code</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes Credit Card Informations like CCLink, CCNo, CCType, CardHolderName, CCExpiryDate,</td>
<td><br />
</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.<br />
EffectiveDate</td>
<td>DATETIME</td>
<td>Booking details for particular effective date</td>
<td>2020-10-25 etc</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.<br />
PackageCode</td>
<td>INT(20)</td>
<td>Package code</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.<br />
PackageName</td>
<td>VARCHAR(100)</td>
<td>Package Name</td>
<td>European Plan</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.<br />
RoomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>123400000000000006</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.<br />
RoomTypeName</td>
<td>STRING(100)</td>
<td>RoomType Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.<br />
RoomName</td>
<td>VARCHAR(100)</td>
<td>Room Name/Number</td>
<td>102</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.Adult</td>
<td>INT(11)</td>
<td>No. of Adults</td>
<td>2,3,4 etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RentalInfo.Child</td>
<td>INT(11)</td>
<td>No. of Childs</td>
<td>2,3,4 etc</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Rent</td>
<td>DECIMAL(19,4)</td>
<td>Room rental amount</td>
<td>1500.43</td>
</tr>
<tr class="odd">
<td>BookingTran. RentalInfo.Discount</td>
<td>DECIMAL(19,4)</td>
<td>Discount on rental room in amount</td>
<td>500</td>
</tr>
<tr class="even">
<td>BookingTran.Sharer.*</td>
<td>–</td>
<td>Here * denotes Sharer informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Nationality,Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityTypeID, IdentityNo, ExpiryDate.</td>
<td></td>
</tr>
<tr class="odd">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>104, 404 etc</td>
</tr>
<tr class="even">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Unauthorized Request. etc</td>
</tr>
</tbody>
</table>

**Success**

``` json
{
"Reservations": {
     "Reservation": [
         {
             "BookingTran": [
                 {
                     "SubBookingId": "RES2233",
                     "TransactionId": "123400000000003264",
                     "Createdatetime": "2020-10-24 17:57:47",
                     "Modifydatetime": "2020-10-24 17:57:47",
                     "Status": "New",
                     "currentstatus": "Checked Out",
                     "IsConfirmed": "1",
                     "CurrentStatus": "Arrived",
                     "VoucherNo": "",
                     "PackageCode": "123400000000000003",
                     "PackageName": "Non Refundable",
                     "RateplanCode": "123400000000000010",
                     "RateplanName": "Seaview Deluxe RoomOnly",
                     "RoomTypeCode": "123400000000000004",
                     "RoomTypeName": "t1",
                     "Start": "2020-10-03",
                     "End": "2020-10-05",
                     "ArrivalTime": "17:48:00",
                     "DepartureTime": "17:48:00",
                     "CurrencyCode": "RS",
                     "TotalAmountAfterTax": "6939.97",
                     "TotalAmountBeforeTax": "5881.33",
                     "TotalTax": "1058.64",
                     "TotalDiscount": "0.00",
                     "TotalExtraCharge": "50.85",
                     "TotalPayment": "0.00",
                     "TACommision": "0.00",
                     "Salutation": "Miss.",
                     "FirstName": "Jia",
                     "LastName": "",
                     "Gender": "Male",
                     "DateOfBirth": "2020-10-01",
                     "SpouseDateOfBirth": "",
                     "WeddingAnniversary": "",
                     "Address": "",
                     "City": "",
                     "State": "",
                     "Country": "Romania",
                     "Nationality": "India",
                     "Zipcode": "",
                     "Phone": "",
                     "Mobile": "",
                     "Fax": "",
                     "Email": "",
                     “RegistrationNo” : "", 
                     "IdentiyType": "Master ID Card",
                     "IdentityNo": "43545",
                     "ExpiryDate": "",
                     "TransportationMode": "",
                     "Vehicle": "",
                     "PickupDate": "",
                     "PickupTime": "",
                     "Source": "WEB",
                     "Comment": "",
                     "AffiliateName": "",
                     "AffiliateCode": "",
                     "CCLink": "",
                     "CCNo": "",
                     "CCType": "",
                     "CCExpiryDate": "",
                     "CardHoldersName": "",
                     "TaxDeatil": [
                         {
                             "TaxCode": "CGST New",
                             "TaxName": "CGST New",
                             "TaxAmount": "263.9000"
                         },
                         {
                             "TaxCode": "CGST New",
                             "TaxName": "CGST New",
                             "TaxAmount": "265.4200"
                         },
                         {
                             "TaxCode": "SGST New",
                             "TaxName": "SGST New",
                             "TaxAmount": "263.9000"
                         },
                         {
                             "TaxCode": "SGST New",
                             "TaxName": "SGST New",
                             "TaxAmount": "265.4200"
                         }
                     ],
                     "ExtraCharge": [
                         {
                             "ChargeDate": "2020-10-03",
                             "ChargeCode": "Laundry",
                             "ChargeName": "Laundry",
                             "ChargeDesc": "Laundry",
                             "Remark": "Laundry",
                             "Quantity": "0",
                             "AmountBeforeTax": "16.95",
                             "AmountAfterTax": "20.01"
                         },
                         {
                             "ChargeDate": "2020-10-04",
                             "ChargeCode": "Laundry",
                             "ChargeName": "Laundry",
                             "ChargeDesc": "Laundry",
                             "Remark": "Laundry",
                             "Quantity": "0",
                             "AmountBeforeTax": "16.95",
                             "AmountAfterTax": "20.01"
                         },
                         {
                             "ChargeDate": "2020-10-05",
                             "ChargeCode": "Laundry",
                             "ChargeName": "Laundry",
                             "ChargeDesc": "Laundry",
                             "Remark": "Laundry",
                             "Quantity": "0",
                             "AmountBeforeTax": "16.95",
                             "AmountAfterTax": "20.01"
                         }
                     ],
                     "RentalInfo": [
                         {
                             "EffectiveDate": "2020-10-03",
                             "PackageCode": "123400000000000003",
                             "PackageName": "Non Refundable",
                             "RoomTypeCode": "123400000000000004",
                             "RoomTypeName": "t1",
                             "RoomName": "102",
                             "Adult": "5",
                             "Child": "1",
                             "RentPreTax": "2932.19",
                             "Rent": "3459.99",
                             "Discount": "0.00"
                         },
                         {
                             "EffectiveDate": "2020-10-04",
                             "PackageCode": "123400000000000003",
                             "PackageName": "Non Refundable",
                             "RoomTypeCode": "123400000000000004",
                             "RoomTypeName": "t1",
                             "RoomName": "102",
                             "Adult": "5",
                             "Child": "1",
                             "RentPreTax": "2949.14",
                             "Rent": "3479.98",
                             "Discount": "0.00"
                         }
                     ],
                 "Sharer": [               
                         {
                          "Salutation": "Ms.",
                          "FirstName": "Test",
                          "LastName": "One",
                          "Gender": "Female",
                          "DateOfBirth": "",
                          "SpouseDateOfBirth": "",
                          "WeddingAnniversary": "",
                          "Address": "",
                          "City": " Brockway",
                          "State": "CA",
                          "Country": "USA",
                          "Nationality": "Malta",
                          "Zipcode": "95730",
                          "Phone": "",
                          "Mobile": "3534",
                          "Fax": "564564",
                          "Email": "LarryLForney@rhyta.com",
                          "RegistrationNo" : "",  
                          "IdentityTypeID": "894300000000000003",
                          "IdentityNo": "12345667765",
                          "ExpiryDate": "",
                         },
                        {
                         "Salutation": "Ms.",
                         "FirstName": "Test",
                         "LastName": "One",
                         "Gender": "Female",
                         "DateOfBirth": "",
                         "SpouseDateOfBirth": "",
                         "WeddingAnniversary": "",
                         "Address": "",
                         "City": " Brockway",
                         "State": "CA",
                         "Country": "USA",
                         "Nationality": "Malta",
                         "Zipcode": "95730",
                         "Phone": "",
                         "Mobile": "3534",
                         "Fax": "564564",
                         "Email": "LarryLForney@rhyta.com",
                         "Registration No" : "",  
                         "IdentityTypeID": "894300000000000003",
                         "IdentityNo": "12345667765",
                         "ExpiryDate": "",
                        }
                      ]
                 }
             ],
             "LocationId": "27",
             "UniqueID": "RES2233",
             "BookedBy": "John",
             "Salutation": "Mr.",
             "FirstName": "John",
             "LastName": "",
             "Gender": "Male",
             "Address": "",
             "City": "",
             "State": "",
             "Country": "Romania",
             "Zipcode": "",
             "Phone": "",
             "Mobile": "",
             "Fax": "",
             "Email": "",
             "Source": "WEB",
             "PaymentMethod": "Abc",
             "IsChannelBooking": "1"
         },
     ]
}
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters.                                                 |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 105            | From Date is missing                                                         |
| 107            | To Date is missing                                                           |
| 109            | Please check From and To date. To Date should be greater than fromdate       |
| 303            | No Data Found.                                                               |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 106            | From Date is not a valid date                                                |
| 108            | To Date is not a valid date                                                  |
| 112            | Error: Date range is too long. Please provide dates for 1 month.             |
| 503            | No Data Found.                                                               |

---

### BKG-07 · Post Charge To Room

**Request\_Type:** `chargepost`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.pos2pms`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #702

*Tags: POS Connectivity*

This API allows you to post charges on a folio. This is basically you take food in the restaurant and ask to do Room Post as you are staying in the same hotel, so you wish to pay finally on checkout. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.pos2pms>

**Header**

Content-Type: application/xml

#### **Parameter**

|                 |               |                                                                  |                              |
|-----------------|---------------|------------------------------------------------------------------|------------------------------|
| **Name**        | **Data Type** | **Description**                                                  | **Example**                  |
| auth \*         | VARCHAR(300)  | Unique Authentication code                                       | XXXXXXXXXXXXXXXXX            |
| oprn \*         | VARCHAR(150)  | Use Keyword “chargepost”                                         |                              |
| room \*         | VARCHAR(50)   | Room Name                                                        | 1401 A                       |
| folio \*        | VARCHAR(50)   | Folio No                                                         | GF1120                       |
| table \*        | VARCHAR(50)   | Table No                                                         | chargepost                   |
| outlet \*       | VARCHAR(50)   | It is should be an Outlet name.                                  | OT                           |
| charge \*       | VARCHAR(150)  | “Restaurant Charge” should be come.                              | Breakfast                    |
| postingdate \*  | DATE          | It is a charge posting date.                                     | 2020-07-02                   |
| trandate \*     | DATE          | A date of charge posting to PMS.                                 | 2020-07-02                   |
| amount \*       | DECIMAL(10,2) | The charging amount of Posting. It must be tax exclusive amount. | 7.57                         |
| tax \*          | DECIMAL(10,2) | It should be Tax amount, if tax applicable. Can take multiple    | 2.00                         |
| gross_amount \* | DECIMAL(10,2) | The charging amount of Posting. It must be tax inclusive amount. | 5.57                         |
| voucherno \*    | VARCHAR(50)   | It should be receipt no.                                         | POS234                       |
| remark          | VARCHAR(200)  | It should be remarks from POS.                                   | Outlet : OT,POS User : Admin |
| posuser \*      | VARCHAR(50)   | POS user who does Posting to PMS.                                | Admin                        |

**Request **

``` xml
<request>
<auth>xxxxxxxxxxxxxxxxxxxxxxxxxxxxx</auth>
<oprn>chargepost</oprn>
<room>101</room>
<folio>8</folio>
<table>chargepost</table>
<outlet>OT</outlet>
<charge>Breakfast</charge>
<postingdate>2020-05-15</postingdate>
<trandate>2020-05-15</trandate>  
<amount>100</amount>
<tax>2.00</tax>
<gross_amount>5.57</gross_amount>
<voucherno>POS895</voucherno>
<remark>Outlet : OT,POS User : Admin</remark>
<posuser>Admin</posuser>
</request>
```

**Response**

|           |               |                                                                 |             |
|-----------|---------------|-----------------------------------------------------------------|-------------|
| **Name**  | **Data Type** | **Description **                                                | **Example** |
| status    | String        | Status value will be providedValues: ok, error                  | ok          |
| msg       | String        | Message result will be providedValues: success or error message | success     |
| hotelname | String        | Name of Hotel                                                   | Hotel       |
| hotelcode | Integer       | ID of Room                                                      | xxxx        |

**Success**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>ok</status>
    <msg>added in queue</msg>
    <requestid>2805</requestid>
</response>
```

**Error**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>error</status>
    <msg>Invalid Authentication</msg>
</response>
```

**Error** ****Codes****

|                                                                                                                                           |                                       |
|-------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------|
| **Errors**                                                                                                                                | **Description**                       |
| Hotel Code In-Active                                                                                                                      | The Property has been deactivated     |
| API Authkey is deactivated                                                                                                                | The Authcode/Key has been deactivated |
| Invalid Authentication                                                                                                                    | Invalid data                          |
| Bad Request                                                                                                                               | Invalid Request Parameter             |
| Invalid API Request. Don’t have this API access                                                                                           | Invalid Request Method                |
| You are not allowed to post charges to room. Reason: POS2PMS account is not setup at PMS end.                                             | –                                     |
| You are not allowed to post charges to room. Reason: Folio not found in PMS.                                                              | –                                     |
| You are not allowed to post charges to the room. Reason: Credit Card details is not available on the booking.                             | –                                     |
| You are not allowed to post charges to room. Reason: Credit limit set on folio says credit balance is less than posting amount.           | –                                     |
| You are not allowed to post charges to room. Reason: Credit limit set on folio says your credit limit for posting charges is over.        | –                                     |
| You are not allowed to post charges to room. Reason : Credit limit set on folio says your daily credit limit for posting charges is over. | –                                     |
| Tax Mapping with PMS and POS are not in Sync                                                                                              | –                                     |

---

### BKG-08 · Void Charge on Room

**Request\_Type:** `voidcharge`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.pos2pms`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #707

*Tags: POS Connectivity*

This API allows you to void/delete the posted charges on a folio in context to [charge post](https://api.ezeetechnosys.com/#702) API. When you have asked the restaurant manager to post charge to room, but then you decide to pay straight away, so for deleting those charges from folio, you can make use of this API. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.pos2pms>

**Header**

Content-Type: application/xml

#### **Parameter**

|              |               |                            |                   |
|--------------|---------------|----------------------------|-------------------|
| **Name**     | **Data Type** | **Description **           | **Example**       |
| auth \*      | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| oprn \*      | VARCHAR(150)  | Use Keyword “voidcharge”   |                   |
| requestid \* | INT(11)       | Need to send request id    | 172               |

**Request **

``` xml
<?xml version="1.0" standalone="yes"?>
<request>
<auth>xxxxxxxxxxxxxxxxxxxxxxxx</auth>
<oprn>voidcharge</oprn>
<requestid>2804</requestid>
</request>
```

**Response**

|          |               |                                                               |             |
|----------|---------------|---------------------------------------------------------------|-------------|
| **Name** | **Data Type** | **Description **                                              | **Example** |
| status   | String        | Status value will be provided Values: ok, error               | ok          |
| msg      | String        | Message result will be provided Values: voided,already voided | voided      |

**Success**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>ok</status>
    <msg>voided</msg>
</response>
```

**Error**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>error</status>
    <msg>Invalid Authentication</msg>
</response>
```

**Error** ****Codes****

|                                                 |                                       |
|-------------------------------------------------|---------------------------------------|
| **Errors**                                      | **Description**                       |
| Hotel Code In-Active                            | The Property has been deactivated     |
| API Authkey is deactivated                      | The Authcode/Key has been deactivated |
| Invalid Authentication                          | Invalid data                          |
| Bad Request                                     | Invalid Request Parameter             |
| Invalid API Request. Don’t have this API access | Invalid Request Method                |
| Invalid request id                              | Provided Request Id is invalid        |
| Invalid Operation                               | –                                     |

---

### BKG-09 · Update POS Receipt No

**Request\_Type:** `updatevoucherno`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.pos2pms`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #710

*Tags: POS Connectivity*

This API allows you to update receipt no on a folio in context to [charge post](https://api.ezeetechnosys.com/#702) API. In case of any issues with receipt no, you can make use of this API to update the correct receipt no. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.pos2pms>

**Header**

Content-Type: application/xml

#### **Parameter**

|              |               |                               |                   |
|--------------|---------------|-------------------------------|-------------------|
| **Name**     | **Data Type** | **Description **              | **Example**       |
| auth \*      | VARCHAR(300)  | Unique Authentication code    | XXXXXXXXXXXXXXXXX |
| oprn \*      | VARCHAR(150)  | Use Keyword “updatevoucherno” |                   |
| voucherno \* | INT(11)       | Voucher No will be provided   | POS245            |
| requestid \* | INT(11)       | Request Id will be provided   | 2804              |

**Request **

``` xml
<?xml version="1.0" standalone="yes"?> 
<request> 
<auth>xxxxxxxxxxxxxxxxxxxxxxx</auth>
<oprn>updatevoucherno</oprn> 
<voucherno>POS245</voucherno>
<requestid>2804</requestid>
</request>
```

**Response**

|          |               |                                                                                                        |                   |
|----------|---------------|--------------------------------------------------------------------------------------------------------|-------------------|
| **Name** | **Data Type** | **Description **                                                                                       | **Example**       |
| status   | String        | Status value will be provided Values: ok, error                                                        | ok                |
| msg      | String        | Message result will be provided Values: already voided, voucher no. already present, voucher no. added | voucher no. added |

**Success**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>ok</status>
    <msg> voucher no. added </msg>
</response>
```

**Error**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>error</status>
    <msg>Invalid Authentication</msg>
</response>
```

**Error** ****Codes****

|                                                 |                                       |
|-------------------------------------------------|---------------------------------------|
| **Errors**                                      | **Description**                       |
| Hotel Code In-Active                            | The Property has been deactivated     |
| API Authkey is deactivated                      | The Authcode/Key has been deactivated |
| Invalid Authentication                          | Invalid data                          |
| Bad Request                                     | Invalid Request Parameter             |
| Invalid API Request. Don’t have this API access | Invalid Request Method                |
| Invalid request id                              | Provided Request Id is invalid        |

---

### BKG-10 · Retrieve Post to Room Information

**Request\_Type:** `roomlist`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.pos2pms`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #712

*Tags: POS Connectivity*

This API provides in-house rooms/folios for your property on which you wish to post the charges in context to [charge post](https://api.ezeetechnosys.com/#702) API. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.pos2pms>

**Header**

Content-Type: application/xml

#### **Parameter**

|          |               |                            |                   |
|----------|---------------|----------------------------|-------------------|
| **Name** | **Data Type** | **Description **           | **Example**       |
| auth \*  | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| oprn \*  | VARCHAR(150)  | Use Keyword “roomlist”     |                   |

**Request **

``` xml
<?xml version="1.0" standalone="yes"?>
<request>
<auth>xxxxxxxxxxxxxxxxxxxxxxx</auth>
<oprn>roomlist</oprn>
</request>
```

**Response**

|              |               |                                                 |               |
|--------------|---------------|-------------------------------------------------|---------------|
| **Name**     | **Data Type** | **Description **                                | **Example**   |
| status       | String        | Status value will be provided Values: ok, error | ok            |
| softwaredate | Date          | Date will be provided                           | 2020-03-19    |
| msg          | String        | Message result will be provided Values:inhouse  | inhouse       |
| guestname    | String        | Guest Name will be provided                     | Mr. Joy       |
| arrival      | Date          | It is giving arrival date                       | 2020-03-17    |
| departure    | Date          | It is giving departure date                     | 2020-03-20    |
| masterfolio  | Integer       | Masterfolio no will be provided                 | 10            |
| room         | String        | It is giving room name/number                   | 106           |
| roomtype     | String        | It is giving room type                          | Studio        |
| ratetype     | String        | It is giving rate type                          | All Inclusive |
| remarks      | String        | It is giving remarks                            | –             |
| resno        | Integer       | It is giving reservation no.                    | 11            |

**Success**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>ok</status>
    <msg>inhouse</msg>
    <softwaredate>2020-03-19</softwaredate>
    <roomrows>
        <row>
            <guestname>Mr. Joy</guestname>
            <arrival>2020-03-17</arrival>
            <departure>2020-03-20</departure>
            <masterfolio>10</masterfolio>
            <room>106</room>
            <roomtype>Studio</roomtype>
            <ratetype>All Inclusive</ratetype>
            <remarks></remarks>
            <resno>11</resno>
        </row>
        <row>
            <guestname>Mrs Sophia</guestname>
            <arrival>2020-03-18</arrival>
            <departure>2020-03-21</departure>
            <masterfolio>22</masterfolio>
            <room>109</room>
            <roomtype>Single Bedroom Suite</roomtype>
            <ratetype>Daily</ratetype>
            <remarks></remarks>
            <resno>21</resno>
        </row>
        <row>
            <guestname>Mr.Denial Mark</guestname>
            <arrival>2020-03-19</arrival>
            <departure>2020-03-21</departure>
            <masterfolio>8</masterfolio>
            <room>101</room>
            <roomtype>Delux</roomtype>
            <ratetype>Frequent Traveller</ratetype>
            <remarks></remarks>
            <resno>9</resno>
        </row>
    </roomrows>
</response>
```

**Error**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>error</status>
    <msg>Invalid Authentication</msg>
</response>
```

**Error** ****Codes****

|                                                 |                                       |
|-------------------------------------------------|---------------------------------------|
| **Errors**                                      | **Description**                       |
| Hotel Code In-Active                            | The Property has been deactivated     |
| API Authkey is deactivated                      | The Authcode/Key has been deactivated |
| Invalid Authentication                          | Invalid data                          |
| Bad Request                                     | Invalid Request Parameter             |
| Invalid API Request. Don’t have this API access | Invalid Request Method                |
| In-House guest room list is empty               | –                                     |

---

### BKG-11 · Retrieve Post to Room Information for specific room

**Request\_Type:** `roomquery`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.pos2pms`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #715

*Tags: POS Connectivity*

This API provides in-house room/folio for your property for a specific room on which you wish to post the charges in context to [charge post](https://api.ezeetechnosys.com/#702) API. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.pos2pms>

**Header**

Content-Type: application/xml

#### **Parameter**

|          |               |                            |                   |
|----------|---------------|----------------------------|-------------------|
| **Name** | **Data Type** | **Description **           | **Example**       |
| auth \*  | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| oprn \*  | VARCHAR(150)  | Use Keyword “roomquery”    |                   |
| room \*  | INT(11)       | Need to provide Room Id    | 106               |

**Request **

``` xml
<?xml version="1.0" standalone="yes"?>
<request>
<auth>xxxxxxxxxxxxxxxxxxxxxxx</auth>
<oprn>roomquery</oprn>
<room>106</room>
</request>
```

**Response**

|              |               |                                                 |               |
|--------------|---------------|-------------------------------------------------|---------------|
| **Name**     | **Data Type** | **Description **                                | **Example**   |
| status       | String        | Status value will be provided Values: ok, error | ok            |
| softwaredate | Date          | Date will be provided                           | 2020-03-19    |
| msg          | String        | Message result will be provided Values:inhouse  | inhouse       |
| guestname    | String        | Guest Name will be provided                     | Mr. Joy       |
| arrival      | Date          | It is giving arrival date                       | 2020-03-17    |
| departure    | Date          | It is giving departure date                     | 2020-03-20    |
| masterfolio  | Integer       | Masterfolio no will be provided                 | 10            |
| room         | String        | It is giving room name/number                   | 106           |
| roomtype     | String        | It is giving room type                          | Studio        |
| ratetype     | String        | It is giving rate type                          | All Inclusive |
| resno        | Integer       | It is giving reservation no.                    | 11            |

**Success**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>ok</status>
    <msg>inhouse</msg>
    <softwaredate>2020-03-19</softwaredate>
    <guestname>Mr.U K Shah</guestname>
    <arrival>2020-03-17</arrival>
    <departure>2020-03-20</departure>
    <room>106</room>
    <masterfolio>10</masterfolio>
    <roomrows>
        <row>
            <guestname>Mr. Joy</guestname>
            <arrival>2020-03-17</arrival>
            <departure>2020-03-20</departure>
            <masterfolio>10</masterfolio>
            <room>106</room>
            <roomtype>Studio</roomtype>
            <ratetype>All Inclusive</ratetype>
            <resno>11</resno>
        </row>
    </roomrows>
</response>
```

**Error**

``` xml
<?xml version='1.0' standalone='yes'?>
<response>
    <status>error</status>
    <msg>Invalid Authentication</msg>
</response>
```

**Error** ****Codes****

|                                                 |                                       |
|-------------------------------------------------|---------------------------------------|
| **Errors**                                      | **Description**                       |
| Hotel Code In-Active                            | The Property has been deactivated     |
| API Authkey is deactivated                      | The Authcode/Key has been deactivated |
| Invalid Authentication                          | Invalid data                          |
| Bad Request                                     | Invalid Request Parameter             |
| Invalid API Request. Don’t have this API access | Invalid Request Method                |
| Room not found                                  | –                                     |

---

### BKG-12 · Room Sales Data

**Request\_Type:** `get_sales_report`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/channelbookings/vacation_rental.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #719

*Tags: Vacation Rental*

This API provides you sales information for rooms for a specific period. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/channelbookings/vacation_rental.php>

**Note:** You need set Authcode in Header.

**Header**

Content-Type: application/json; AUTH_CODE: XXXXXXXXXXXXXXXXX

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>request_type *</td>
<td>VARCHAR(150)</td>
<td>Use Keyword “get_sales_report”</td>
<td></td>
</tr>
<tr class="odd">
<td>hotel_id *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>room_id *</td>
<td>INT(20)</td>
<td>List of room Ids (If a date range is same for all Room IDs then all Ids will be listed in a single block else separate block will be there for a different date range) </td>
<td>1234500000000001, 1234500000000002</td>
</tr>
<tr class="odd">
<td>from_date *</td>
<td>Date</td>
<td>Start date of calendar information is to be requested<br />
<strong>Format:</strong> YYYY-MM-DD</td>
<td>2020-06-25</td>
</tr>
<tr class="even">
<td>to_date *</td>
<td>Date</td>
<td>End date of calendar information is to be requested<br />
<strong>Format:</strong> YYYY-MM-DD</td>
<td>2020-07-10</td>
</tr>
</tbody>
</table>

**Request **

``` json
{   
"request_type": "get_sales_report",
    "body": {
        "hotel_id": "xxxx",
        "rooms": [{
            "room_id": ["1234500000000000001", "1234500000000000002"],
            "from_date": "2020-04-25",
            "to_date": "2020-05-08"
        }]
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Failure or success of the request<br />
Values: Success, Error</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data.hotel_id</td>
<td>Integer</td>
<td>ID of Hotel</td>
<td>xxxx</td>
</tr>
<tr class="even">
<td>data.hotel_name</td>
<td>String</td>
<td>Name of Hotel</td>
<td>Hotel Name</td>
</tr>
<tr class="odd">
<td>data.Report.*</td>
<td>String</td>
<td>Here * means Room type ID</td>
<td>1234500000000001</td>
</tr>
<tr class="even">
<td>data.Report.*.room_name</td>
<td>String</td>
<td>Name of Room</td>
<td>Super Deluxe</td>
</tr>
<tr class="odd">
<td>data.Report.*.#</td>
<td>String</td>
<td>Here # means Room Code</td>
<td>L01</td>
</tr>
<tr class="even">
<td>data.Report.*.#.room_nights</td>
<td>Integer</td>
<td>Total available rooms for the month.<br />
</td>
<td>7</td>
</tr>
<tr class="odd">
<td>data.Report.*.#.room_sold</td>
<td>Integer</td>
<td>No. of room sold only. (not included complimentary)</td>
<td>5</td>
</tr>
<tr class="even">
<td>data.Report.*.#.complementary</td>
<td>String</td>
<td>Complimentary</td>
<td>–</td>
</tr>
<tr class="odd">
<td>data.Report.*.#.occupancy</td>
<td>Integer</td>
<td>Occupancy of room</td>
<td>4</td>
</tr>
<tr class="even">
<td>data.Report.*.#.adr</td>
<td>String</td>
<td>Average Daily rate</td>
<td>950</td>
</tr>
<tr class="odd">
<td>data.Report.*.#.pax</td>
<td>String</td>
<td>No. of pax in Room</td>
<td>4</td>
</tr>
<tr class="even">
<td>data.Report.*.#.room_charges</td>
<td>Long</td>
<td>Room Charges</td>
<td>85</td>
</tr>
<tr class="odd">
<td>data.Report.*.#.extra_charges</td>
<td>Long</td>
<td>Extra Charged</td>
<td>4</td>
</tr>
<tr class="even">
<td>data.Report.*.#.channel</td>
<td>String</td>
<td>Channel name &amp; channel hotel code<strong>name_channelHotelCode</strong> (Which are mapped with this room type)</td>
<td>Booking.com_11111</td>
</tr>
<tr class="odd">
<td>error_code</td>
<td>–</td>
<td>Error code in case of failure</td>
<td>105</td>
</tr>
<tr class="even">
<td>error_message</td>
<td>–</td>
<td>Error Message in case of failure</td>
<td>Invalid Reservation ID</td>
</tr>
</tbody>
</table>

**Success**

``` json
{  "status": "success",
  "data": {
    "hotel_id": "xxxx",
    "hotel_name": "Hotel Name",
    "report": [
      {
        "1234500000000000001": {
          "106": {
            "room_nights": 14,
            "room_sold": 0,
            "complementary": 0,
            "occupancy": 0,
            "adr": 0,
            "pax": 0,
            "room_charges": 0,
            "extra_charges": 0,
            "channel": ""
          },
          "room_name": "Studio"
        }
      },
      {
        "1234500000000000002": {
          "107": {
            "room_nights": 14,
            "room_sold": 0,
            "complementary": 0,
            "occupancy": 0,
            "adr": 0,
            "pax": 0,
            "room_charges": 0,
            "extra_charges": 0,
            "channel": ""
          },
          "111": {
            "room_nights": 14,
            "room_sold": 0,
            "complementary": 0,
            "occupancy": 0,
            "adr": 0,
            "pax": 0,
            "room_charges": 0,
            "extra_charges": 0,
            "channel": ""
          },
          "112": {
            "room_nights": 14,
            "room_sold": 0,
            "complementary": 0,
            "occupancy": 0,
            "adr": 0,
            "pax": 0,
            "room_charges": 0,
            "extra_charges": 0,
            "channel": ""
          },
          "113": {
            "room_nights": 14,
            "room_sold": 0,
            "complementary": 0,
            "occupancy": 0,
            "adr": 0,
            "pax": 0,
            "room_charges": 0,
            "extra_charges": 0,
            "channel": ""
          },
          "room_name": "Double Bedroom Suite"
        }
      }
    ]
  }
}
```

**Error Codes**

|                |                                                           |
|----------------|-----------------------------------------------------------|
| **Error Code** | **Error Name**                                            |
| 101            | Invalid Hotel Id                                          |
| 102            | Invalid Authentication                                    |
| 103            | Blank Request                                             |
| 104            | Invalid Request Format                                    |
| 105            | Missing Required Parameter                                |
| 106            | Invalid Reservation ID                                    |
| 107            | Invalid Date Format                                       |
| 108            | Invalid Date Range                                        |
| 109            | Currently Data can be requested for max 15 days           |
| 110            | Invalid Room Id                                           |
| 111            | IP Address is not Authorised                              |
| 112            | Invalid Request Method                                    |
| 113            | Hotel Code is not Active                                  |
| 114            | Invalid Room Code or not associated with supplied room ID |
| 115            | Internal Problem                                          |

---

### BKG-13 · Reserved Rooms Calendar

**Request\_Type:** `get_calendar`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/channelbookings/vacation_rental.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #732

*Tags: Vacation Rental*

This API helps you to populate a stayview calendar with needful information for specific date ranges on your selected rooms. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/channelbookings/vacation_rental.php>

**Note:** You need set Authcode in Header.

**Header**

Content-Type: application/json; AUTH_CODE: XXXXXXXXXXXXXXXXX

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>request_type *</td>
<td>VARCHAR(150)</td>
<td>Use Keyword “get_calendar”</td>
<td></td>
</tr>
<tr class="odd">
<td>hotel_id *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>room_id *</td>
<td>INT(20)</td>
<td>List of room Ids(If a date range is same for all Room IDs then all Ids will be listed in a single block else separate block will be there for a different date range) </td>
<td>1234500000000001, 1234500000000002</td>
</tr>
<tr class="odd">
<td>room_code *</td>
<td>INT(20)</td>
<td>List of room codes</td>
<td>“102”, “104”,”108″</td>
</tr>
<tr class="even">
<td>from_date *</td>
<td>Date</td>
<td>Start date of calendar information is to be requested<br />
<strong>Format:</strong> YYYY-MM-DD</td>
<td>2020-06-15</td>
</tr>
<tr class="odd">
<td>to_date *</td>
<td>Date</td>
<td>End date of calendar information is to be requested<br />
<strong>Format:</strong> YYYY-MM-DD</td>
<td>2020-07-15</td>
</tr>
</tbody>
</table>

**Request **

``` json
{    "request_type": "get_calendar",
    "body": {

        "hotel_id": "xxxx",
        "rooms": [{
                "room_id": ["1234500000000000002", "1234500000000000003"],
           "room_code": ["107", "111", "112", "113"],
                "from_date": "2020-04-15",
                "to_date": "2020-05-15"
            },
            {
                "room_id": ["1234500000000000007"],
                "room_code": ["125","126"],
                "from_date": "2020-04-15",
                "to_date": "2020-05-15"
            }
        ]
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Failure or success of the request<br />
Values: Success, Error</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data.*</td>
<td>Integer</td>
<td>Here * means Room type ID</td>
<td>1234500000000001</td>
</tr>
<tr class="even">
<td>data.*.room_name</td>
<td>String</td>
<td>Name of Room</td>
<td>Super Deluxe</td>
</tr>
<tr class="odd">
<td>data.*.room_name.date</td>
<td>Date</td>
<td>Calendar Date<strong>Format:</strong> YYYY-MM-DD</td>
<td>2020-03-01</td>
</tr>
<tr class="even">
<td>data.*.room_name.status</td>
<td>String</td>
<td>Status of the roomValues : <strong>Reserved</strong>: If book is Booked<strong>Blocked</strong>: If sell is stopped for particular reason</td>
<td>Reserved</td>
</tr>
<tr class="odd">
<td>data.*.room_name.reservation_info</td>
<td>–</td>
<td>If Room status is blocked then the Value of this Parameter will be blank else if room is booked, then reservation details will be supplied. </td>
<td>–</td>
</tr>
<tr class="even">
<td>data.*.room_name.reservation_info.reservation_id</td>
<td>String</td>
<td>Reservation Id</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>data.*.room_name.reservation_info.channel</td>
<td>String</td>
<td>Channel name &amp; channel hotel code from where a booking has been come in below format<strong>name_channelHotelCode</strong></td>
<td><br />
</td>
</tr>
<tr class="even">
<td>data.*.room_name.reservation_info.guest_name</td>
<td>String</td>
<td>Name of guest</td>
<td>Guest Name</td>
</tr>
<tr class="odd">
<td>data.*.room_name.reservation_info.check_in</td>
<td>Date</td>
<td>Date of Check-in</td>
<td>2020-04-01 12:00:00</td>
</tr>
<tr class="even">
<td>data.*.room_name.reservation_info.check_out</td>
<td>Date</td>
<td>Date of Check-Our</td>
<td>2020-05-03 12:00:00</td>
</tr>
<tr class="odd">
<td>error_code</td>
<td>–</td>
<td>Error code in case of failure</td>
<td>101</td>
</tr>
<tr class="even">
<td>error_message</td>
<td>–</td>
<td>Error Message in case of failure</td>
<td>Invalid Authentication Data</td>
</tr>
</tbody>
</table>

**Success**

``` json
{ "status": "success",
 "data": {
  "1234500000000000002": {
   "room_info": "No Booking/Blocks are available for supplied Date Range"
  },
  "1234500000000000003": {
   "room_info": "No Booking/Blocks are available for supplied Date Range"
  },
  "1234500000000000007": {
   "room_name": "Stander",
   "room_info": [
    {
     "room_code": "125",
     "date": "2020-05-09",
     "status": "Reserved",
     "reservation_info": {
      "folios": {
       "33": {
        "Room Charges": "450.0000",
        "Service Tax": "100.0000",
        "All in Package [Qty -2.0000]": "300.0000"
       }
      },
      "reservation_id": "32",
      "guest_name": "Mam. Daya",
      "channel": "",
      "remark": "",
      "check_in": "2020-05-09 12:00:00",
      "check_out": "2020-05-10 11:00:00",
      "booking_status": "Confirmed Reservation",
      "total_amount": 850,
      "currency": "INR",
      "payment_type": "Pay At Hotel"
     }
    }
   ]
  }
 }
}
```

**Error Codes**

|                |                                                           |
|----------------|-----------------------------------------------------------|
| **Error Code** | **Error Name**                                            |
| 101            | Invalid Hotel Id                                          |
| 102            | Invalid Authentication                                    |
| 103            | Blank Request                                             |
| 104            | Invalid Request Format                                    |
| 105            | Missing Required Parameter                                |
| 106            | Invalid Reservation ID                                    |
| 107            | Invalid Date Format                                       |
| 108            | Invalid Date Range                                        |
| 109            | Currently Data can be requested for max 15 days           |
| 110            | Invalid Room Id                                           |
| 111            | IP Address is not Authorised                              |
| 112            | Invalid Request Method                                    |
| 113            | Hotel Code is not Active                                  |
| 114            | Invalid Room Code or not associated with supplied room ID |
| 115            | Internal Problem                                          |

---

### BKG-14 · Retrieve Physical Rooms

**Request\_Type:** `get_rooms`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/channelbookings/vacation_rental.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #737

*Tags: Vacation Rental*

This API provides physical room information for your property. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/channelbookings/vacation_rental.php>

**Note:** You need set Authcode in Header.

**Header**

Content-Type: application/json; AUTH_CODE: xxxxxxxxxxxxx

#### **Parameter**

|                 |               |                         |             |
|-----------------|---------------|-------------------------|-------------|
| **Name**        | **Data Type** | **Description **        | **Example** |
| request_type \* | VARCHAR(150)  | Use Keyword “get_rooms” |             |
| hotel_id \*     | INT(11)       | Unique Hotel code       | XXXX        |

**Request **

``` json
{   
"request_type": "get_rooms",
    "body": {
        "hotel_id": "xxxx"
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Failure or success of the request<br />
Values: Success, Error</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data.rooms.room_id</td>
<td>Integer</td>
<td>Room Id</td>
<td>1234500000000000001</td>
</tr>
<tr class="even">
<td>data.rooms.room_name</td>
<td>String</td>
<td>Name of room</td>
<td>Studio Room</td>
</tr>
<tr class="odd">
<td>data.rooms.room_code</td>
<td>String</td>
<td>Room codes </td>
<td>106</td>
</tr>
<tr class="even">
<td>error_code</td>
<td>–</td>
<td>Error code in case of failure</td>
<td>105</td>
</tr>
<tr class="odd">
<td>error_message</td>
<td>–</td>
<td>Error Message in case of failure</td>
<td>Invalid Reservation ID</td>
</tr>
</tbody>
</table>

**Success**

``` json
{ "status": "success",
 "data": {
  "rooms": [
   {
    "room_id": "1234500000000000001",
    "room_name": "Studio",
    "rooms": "106",
    "room_code": "106 : Active"
   },
   {
    "room_id": "1234500000000000002",
    "room_name": "Double Bedroom Suite",
    "rooms": "107,111,112,113",
    "room_code": "107 : Active,111 : Active,112 : Active,113 : Active"
   },
   ]
 }
}
```

**Error Codes**

|                |                                                           |
|----------------|-----------------------------------------------------------|
| **Error Code** | **Error Name**                                            |
| 101            | Invalid Hotel Id                                          |
| 102            | Invalid Authentication                                    |
| 103            | Blank Request                                             |
| 104            | Invalid Request Format                                    |
| 105            | Missing Required Parameter                                |
| 106            | Invalid Reservation ID                                    |
| 107            | Invalid Date Format                                       |
| 108            | Invalid Date Range                                        |
| 109            | Currently Data can be requested for max 15 days           |
| 110            | Invalid Room Id                                           |
| 111            | IP Address is not Authorised                              |
| 112            | Invalid Request Method                                    |
| 113            | Hotel Code is not Active                                  |
| 114            | Invalid Room Code or not associated with supplied room ID |
| 115            | Internal Problem                                          |

---

### BKG-15 · Todays CheckIn-Checkout

**Request\_Type:** `get_calendar`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/channelbookings/vacation_rental.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #740

*Tags: Vacation Rental*

This API provides supplied room information for  today’s arrival-departure like reservation no, room no and arrival-departure date-time . The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/channelbookings/vacation_rental.php>

**Note:** You need set Authcode in Header.

**Header**

Content-Type: application/json; AUTH_CODE: xxxxxxxxxxxxx

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>request_type *</td>
<td>VARCHAR(150)</td>
<td>Use Keyword “get_calendar”</td>
<td></td>
</tr>
<tr class="odd">
<td>hotel_id *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>report_type *</td>
<td>VARCHAR(150)</td>
<td>3 types of values can be passed with this parameter,<br />
<strong>checkin</strong> – To get today’s Arrivals<br />
<strong>checkout</strong> – To get today’s departure<br />
<strong>both</strong> – To get today’s arrivals &amp; departures<br />
</td>
<td>both</td>
</tr>
</tbody>
</table>

**Request **

``` json
{    "request_type": "get_calendar",
    "body": {
            "hotel_id": "xxxx",
            "report_type":"both"
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Failure or success of the request<br />
Values: Success, Error</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data.*</td>
<td>Integer</td>
<td>Here * means property ID</td>
<td>xxxx</td>
</tr>
<tr class="even">
<td>data.*.arrivals and/or data.*.departures</td>
<td>String</td>
<td>arrivals or departures parameter will be available according to the value of report_type sent in request</td>
<td>arrivals</td>
</tr>
<tr class="odd">
<td>data.*.arrivals.reservation_id</td>
<td>Integer</td>
<td>Reservation ID</td>
<td>938</td>
</tr>
<tr class="even">
<td>data.*.arrivals.room_code</td>
<td>String</td>
<td>Room no. of particular room</td>
<td>L3</td>
</tr>
<tr class="odd">
<td>data.*.arrivals.arrival_date_time</td>
<td>Date</td>
<td>Arrival-departure date &amp; time in the below format.<br />
YYYY-MM-DD HH:MM:SS</td>
<td>2020-03-29 12:00:00</td>
</tr>
<tr class="even">
<td>error_code</td>
<td>–</td>
<td>Error code in case of failure</td>
<td>101</td>
</tr>
<tr class="odd">
<td>error_message</td>
<td>–</td>
<td>Error Message in case of failure</td>
<td>Invalid Authentication Data</td>
</tr>
</tbody>
</table>

**Success**

``` json
{ 
"status": "success",
 "data": {
  "12345": {
   "arrivals": [
    {
     "reservation_id": "32",
     "room_code": "125",
     "arrival_date_time": "2020-05-09 12:00:00"
    }
   ]
  }
 }
}
```

**Error Codes**

|                |                                                           |
|----------------|-----------------------------------------------------------|
| **Error Code** | **Error Name**                                            |
| 101            | Invalid Hotel Id                                          |
| 102            | Invalid Authentication                                    |
| 103            | Blank Request                                             |
| 104            | Invalid Request Format                                    |
| 105            | Missing Required Parameter                                |
| 106            | Invalid Reservation ID                                    |
| 107            | Invalid Date Format                                       |
| 108            | Invalid Date Range                                        |
| 109            | Currently Data can be requested for max 15 days           |
| 110            | Invalid Room Id                                           |
| 111            | IP Address is not Authorised                              |
| 112            | Invalid Request Method                                    |
| 113            | Hotel Code is not Active                                  |
| 114            | Invalid Room Code or not associated with supplied room ID |
| 115            | Internal Problem                                          |

---

### BKG-16 · Reservation Details of a Room

**Request\_Type:** `get_reservation`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/channelbookings/vacation_rental.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #742

*Tags: Vacation Rental*

This API provides basic booking information for a room. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/channelbookings/vacation_rental.php>

**Note:** You need set Authcode in Header.

**Header**

Content-Type: application/json; AUTH_CODE: XXXXXXXXXXXXXXXXX

#### **Parameter**

|                   |               |                                          |             |
|-------------------|---------------|------------------------------------------|-------------|
| **Name**          | **Data Type** | **Description **                         | **Example** |
| request_type \*   | VARCHAR(150)  | Use Keyword “get_reservation”            |             |
| hotel_id \*       | INT(11)       | Property ID                              | XXXX        |
| reservation_id \* | INT(20)       | To get the details of the reserved room  | 25          |

**Request **

``` json
{   
"request_type": "get_reservation",
    "body": {
            "hotel_id": "XXXX",
            "reservation_id": "25"
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Failure or success of the request<br />
Values: Success, Error</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data.hotel_id</td>
<td>Integer</td>
<td>ID of Hotel</td>
<td>xxxx</td>
</tr>
<tr class="even">
<td>data.hotel_name</td>
<td>String</td>
<td>Name of Hotel</td>
<td>Hotel</td>
</tr>
<tr class="odd">
<td>data.room_id</td>
<td>Integer</td>
<td>ID of Room</td>
<td>1234500000000002</td>
</tr>
<tr class="even">
<td>data.room_name</td>
<td>String</td>
<td>Name of Room</td>
<td>Super Deluxe</td>
</tr>
<tr class="odd">
<td>data.reservation_id</td>
<td>Integer</td>
<td>Reservation ID</td>
<td>RES124</td>
</tr>
<tr class="even">
<td>data.guest_name</td>
<td>String</td>
<td>Name of the Guest</td>
<td>Ion Morgal</td>
</tr>
<tr class="odd">
<td>data.check_in</td>
<td>Date</td>
<td>Check-in Date</td>
<td>RES123</td>
</tr>
<tr class="even">
<td>data.check_out</td>
<td>Date</td>
<td>Check-out Date</td>
<td>2020-03-30 11:00:00</td>
</tr>
<tr class="odd">
<td>data.total_amount</td>
<td>Long</td>
<td>Total Booking amount</td>
<td>2950</td>
</tr>
<tr class="even">
<td>data.currency</td>
<td>String</td>
<td>Currency</td>
<td>INR</td>
</tr>
<tr class="odd">
<td>data.channel</td>
<td>String</td>
<td>Channel name &amp; channel hotel code from where a booking has been come in below format<strong>name_channelHotelCode</strong></td>
<td><br />
</td>
</tr>
<tr class="even">
<td>data.payment_type</td>
<td>String</td>
<td>Payment Type Values : PayAtHotel, AgencyCollect</td>
<td>Pay At Hotel</td>
</tr>
<tr class="odd">
<td>errorCode</td>
<td>–</td>
<td>Error code in case of failure</td>
<td>105</td>
</tr>
<tr class="even">
<td>errorMessage</td>
<td>–</td>
<td>Error Message in case of failure</td>
<td>Invalid Reservation ID</td>
</tr>
</tbody>
</table>

**Success**

``` json
{ "status": "success",
 "data": [
  {
   "hotel_id": "xxxx",
   "hotel_name": "Hotel",
   "room_id": "1234500000000000004",
   "room_name": "Delux",
   "room_code": "101",
   "reservation_id": "25",
   "booking_status": "Confirmed Reservation",
   "guest_name": "Mr. Ion Morgal",
   "check_in": "2020-03-29 12:00:00",
   "check_out": "2020-03-30 11:00:00",
   "remark": "",
   "total_amount": 2950,
   "currency": "INR",
   "channel": "",
   "payment_type": "Pay At Hotel"
  }
 ]
}
```

**Error Codes**

|                |                                                           |
|----------------|-----------------------------------------------------------|
| **Error Code** | **Error Name**                                            |
| 101            | Invalid Hotel Id                                          |
| 102            | Invalid Authentication                                    |
| 103            | Blank Request                                             |
| 104            | Invalid Request Format                                    |
| 105            | Missing Required Parameter                                |
| 106            | Invalid Reservation ID                                    |
| 107            | Invalid Date Format                                       |
| 108            | Invalid Date Range                                        |
| 109            | Currently Data can be requested for max 15 days           |
| 110            | Invalid Room Id                                           |
| 111            | IP Address is not Authorised                              |
| 112            | Invalid Request Method                                    |
| 113            | Hotel Code is not Active                                  |
| 114            | Invalid Room Code or not associated with supplied room ID |
| 115            | Internal Problem                                          |

---

### BKG-17 · Pull Historical Bookings

**Request\_Type:** `Booking`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/getdataAPI.php`  ·  **Content-Type:** application/xml  ·  **eZee ref:** #751

*Tags: RMS*

This API provides you all historical bookings information based on reservation dates of both past and future as per your needs. The API can return data in XML formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/getdataAPI.php>

**Header**

Content-Type: application/xml

#### **Parameter**

|                 |               |                            |                   |
|-----------------|---------------|----------------------------|-------------------|
| **Name**        | **Data Type** | **Description**            | **Example**       |
| Request_Type \* | VARCHAR(250)  | Use Keyword “Booking”      |                   |
| HotelCode \*    | INT(11)       | Unique Hotel code          | XXXX              |
| AuthCode \*     | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| FromDate \*     | DATE          | To send a from date        | 2020-07-05        |
| ToDate \*       | DATE          | To send a to date          | 2020-07-06        |

Note – The difference between the start date and end date should not be more than 2 days.

**Request **

``` xml
<RES_Request>   
<Request_Type>Booking</Request_Type>
    <Authentication>
       <HotelCode>xxxx</HotelCode>
       <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <FromDate>2020-03-05</FromDate>
    <ToDate>2020-03-06</ToDate>
</RES_Request>
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>LocationId</td>
<td>INT(11)</td>
<td>Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>UniqueID</td>
<td>VARCHAR(255)</td>
<td>Unique Booking id</td>
<td>10125, 86436, B4525 etc</td>
</tr>
<tr class="even">
<td>BookedBy</td>
<td>VARCHAR(255)</td>
<td>Information regarding Booked by</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email.</td>
<td>VARCHAR(255)</td>
<td>Here * denotes guest information likeSalutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email.</td>
<td>shown in JSON response below.</td>
</tr>
<tr class="even">
<td>BusinessSource</td>
<td>VARCHAR(100)</td>
<td>Business Source Name</td>
<td></td>
</tr>
<tr class="odd">
<td>Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Booking.com etc</td>
</tr>
<tr class="even">
<td>IsChannelBooking</td>
<td>INT(1)</td>
<td>Is booking comes from channel [0 or 1]1 : Booking from the channel.0: Booking not from the channel.</td>
<td>0 or 1</td>
</tr>
<tr class="odd">
<td>BookingTran. SubBookingId</td>
<td>VARCHAR(255)</td>
<td>Sub booking Id</td>
<td>138</td>
</tr>
<tr class="even">
<td>BookingTran. TransactionId</td>
<td>INT(20)</td>
<td>Booking Transaction ID</td>
<td>112500000000000163</td>
</tr>
<tr class="odd">
<td>BookingTran.Createdatetime</td>
<td>DATETIME</td>
<td>Booking created date time</td>
<td>2020-03-16 12:00:58</td>
</tr>
<tr class="even">
<td>BookingTran.Modifydatetime</td>
<td>DATETIME</td>
<td>Booking modified date time</td>
<td>2020-03-16 12:00:58</td>
</tr>
<tr class="odd">
<td>BookingTran. Status</td>
<td>VARCHAR(1000)</td>
<td>Booking Status</td>
<td>New or Modify.</td>
</tr>
<tr class="even">
<td>BookingTran.IsConfirmed</td>
<td>INT(1)</td>
<td>Booking Confirmation Flag. [1 or 0]<br />
1 : Confirmed0 : Not Confirmed</td>
<td>1 or 0.</td>
</tr>
<tr class="odd">
<td>BookingTran.CurrentStatus</td>
<td>VARCHAR(100)</td>
<td>Booking Current Status<br />
EX : Confirm, Check-In, Check-Out, etc</td>
<td>Check-In</td>
</tr>
<tr class="even">
<td>BookingTran. VoucherNo</td>
<td>VARCHAR(255)</td>
<td>Booking Voucher No</td>
<td>10203049/8512</td>
</tr>
<tr class="odd">
<td>BookingTran. PackageCode</td>
<td>INT(20)</td>
<td>Package Code</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>BookingTran. PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RateplanCode</td>
<td>INT(20)</td>
<td>Unique RatePlan Code</td>
<td>112500000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RateplanName</td>
<td>STRING(1000)</td>
<td>RatePlan Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran. eZeePMSRoomid</td>
<td>INT(20)</td>
<td>eZee PMS Room Id</td>
<td>106</td>
</tr>
<tr class="even">
<td>BookingTran. RoomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>112500000000000006</td>
</tr>
<tr class="odd">
<td>BookingTran. RoomTypeName</td>
<td>STRING(1000)</td>
<td>RoomType Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="even">
<td>BookingTran. Start</td>
<td>DATETIME</td>
<td>Check-in date<br />
[Format : yyyy-mm-dd]</td>
<td>2017-12-25</td>
</tr>
<tr class="odd">
<td>BookingTran. End</td>
<td>DATETIME</td>
<td>Check-out date [Format : yyyy-mm-dd]</td>
<td>2017-12-27</td>
</tr>
<tr class="even">
<td>BookingTran. CurrencyCode</td>
<td>VARCHAR(255)</td>
<td>Currency code</td>
<td>INR</td>
</tr>
<tr class="odd">
<td>BookingTran.TotalRate</td>
<td>DECIMAL(19,4)</td>
<td>Rate on room in amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran.TotalAmountAfterTax</td>
<td>DECIMAL(19,4)</td>
<td>Total amount after tax</td>
<td>1500.43</td>
</tr>
<tr class="odd">
<td>BookingTran.TotalAmountBeforeTax</td>
<td>DECIMAL(19,4)</td>
<td>Total amount before tax</td>
<td>1200</td>
</tr>
<tr class="even">
<td>BookingTran.TotalTax</td>
<td>DECIMAL(19,4)</td>
<td>Total tax</td>
<td>300.43</td>
</tr>
<tr class="odd">
<td>BookingTran. TotalDiscount</td>
<td>DECIMAL(19,4)</td>
<td>Discount on room in amount</td>
<td>500</td>
</tr>
<tr class="even">
<td>BookingTran. TotalExtraCharge</td>
<td>DECIMAL(19,4)</td>
<td>Extra charges in amount(if any)</td>
<td>300</td>
</tr>
<tr class="odd">
<td>BookingTran. TotalPayment</td>
<td>DECIMAL(19,4)</td>
<td>Payment for room in amount</td>
<td>2500.54</td>
</tr>
<tr class="even">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes guest informations likeSalutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,IdentityType,<br />
IdentityNo, ExpiryDate.</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. TransportationMode</td>
<td>VARCHAR(100)</td>
<td>Mode of transportation</td>
<td>Bus, car etc</td>
</tr>
<tr class="even">
<td>BookingTran. Vehicle</td>
<td>VARCHAR(255)</td>
<td>Detail of vehicle</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. PickupDate</td>
<td>DATETIME</td>
<td>Pickup date<br />
[Format : yyyy-mm-dd]</td>
<td>2017-12-25 etc</td>
</tr>
<tr class="even">
<td>BookingTran. PickupTime</td>
<td>DATETIME</td>
<td>Pickup time</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td><a href="http://booking.com/">Booking.com</a></td>
</tr>
<tr class="even">
<td>BookingTran. Comment</td>
<td>VARCHAR(1000)</td>
<td>Additional Information or comment.</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. AffiliateName</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Name</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran.AffiliateCode</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Code</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes information like Credit Card Informations likeCCLink, CCNo, CCType,CardHolderName, CCExpiryDate,</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran.ExtraCharge .*</td>
<td>–</td>
<td>here * denotes ChargeDate,ChargeCode,<br />
ChargeName,<br />
ChargeDesc,Remark,Quantity,<br />
AmountBeforeTax,Amount</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.EffectiveDate</td>
<td>DATETIME</td>
<td>Booking details for particular effective date</td>
<td>2017-12-25 etc</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.PackageCode</td>
<td>INT(20)</td>
<td>Package code</td>
<td>112500000000000001</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.R oomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>112500000000000006</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.R oomTypeName</td>
<td>STRING(1000)</td>
<td>RoomType Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.Adult</td>
<td>INT(11)</td>
<td>No. of Adults</td>
<td>2,3,4 etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RentalInfo.Child</td>
<td>INT(11)</td>
<td>No. of Childs</td>
<td>2,3,4 etc</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Rent</td>
<td>DECIMAL(19,4)</td>
<td>Room rental amount</td>
<td>1500.43</td>
</tr>
<tr class="odd">
<td>BookingTran. RentalInfo.Discount</td>
<td>DECIMAL(19,4)</td>
<td>Discount on rental room in amount</td>
<td>500</td>
</tr>
<tr class="even">
<td>BookingTran. Sharer. *</td>
<td>–</td>
<td>Here * denotes informations likeSalutation,<br />
FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth,<br />
WeddingAnniversary, Nationality,<br />
Address, City, State,<br />
Country, Zip Code, Phone, Mobile, Fax, Email,IdentityType,<br />
IdentityNo, ExpiryDate.</td>
<td></td>
</tr>
<tr class="odd">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>104, 404 etc</td>
</tr>
<tr class="even">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Unauthorized Request. etc</td>
</tr>
</tbody>
</table>

**Success**

``` xml
<?xml version="1.0" encoding="UTF-8"?><RES_Response>
    <Reservations>
        <Reservation>
            <BookByInfo>
                <LocationId>8943</LocationId>
                <UniqueID>11</UniqueID>
                <BookedBy>Joy Smith</BookedBy>
                <Salutation>Mr.</Salutation>
                <FirstName>Joy</FirstName>
                <LastName>Smith</LastName>
                <Gender>Male</Gender>
                <Address></Address>
                <City></City>
                <State></State>
                <Country>India</Country>
                <Zipcode></Zipcode>
                <Phone></Phone>
                <Mobile></Mobile>
                <Fax></Fax>
                <Email></Email>
                <BusinessSource>Booking.com</BusinessSource>
                <Source>PMS</Source>
                <IsChannelBooking>0</IsChannelBooking>
                <BookingTran>
                    <SubBookingId>11</SubBookingId>
                    <TransactionId>894300000000000010</TransactionId>
                    <Createdatetime>2020-03-05 12:00:58</Createdatetime>
                    <Modifydatetime>2020-03-16 12:00:58</Modifydatetime>
                    <Status>New</Status>
                    <IsConfirmed>1</IsConfirmed>
                    <CurrentStatus>Check-In</CurrentStatus>
                    <VoucherNo></VoucherNo>
                    <PackageCode>894300000000000002</PackageCode>
                    <PackageName>All Inclusive</PackageName>
                    <RateplanCode>894300000000000013</RateplanCode>
                    <RateplanName>Studio All Inclusive</RateplanName>
                    <eZeePMSRoomid>106</eZeePMSRoomid>
                    <RoomTypeCode>894300000000000001</RoomTypeCode>
                    <RoomTypeName>Studio</RoomTypeName>
                    <Start>2020-03-17</Start>
                    <End>2020-03-20</End>
                    <CurrencyCode>INR</CurrencyCode>
                    <TotalRate>8850.00</TotalRate>
                    <TotalAmountAfterTax>8850.00</TotalAmountAfterTax>
                    <TotalAmountBeforeTax>7500.00</TotalAmountBeforeTax>
                    <TotalTax>1350.00</TotalTax>
                    <TotalDiscount>0.00</TotalDiscount>
                    <TotalExtraCharge>15.00</TotalExtraCharge>
                    <TotalPayment>8865.00</TotalPayment>
                    <PayAtHotel>false</PayAtHotel>
                    <TACommision>0.00</TACommision>
                    <Salutation>Mr.</Salutation>
                    <FirstName>Joy</FirstName>
                    <LastName>Smith</LastName>
                    <Gender>Male</Gender>
                    <DateOfBirth></DateOfBirth>
                    <SpouseDateOfBirth></SpouseDateOfBirth>
                    <WeddingAnniversary></WeddingAnniversary>
                    <Nationality></Nationality>
                    <Address></Address>
                    <City></City>
                    <State></State>
                    <Country>India</Country>
                    <Zipcode></Zipcode>
                    <Phone></Phone>
                    <Mobile></Mobile>
                    <Fax></Fax>
                    <Email></Email>
                    <IdentiyType>Aadhar card</IdentiyType>
                    <IdentityNo>12315346546</IdentityNo>
                    <ExpiryDate></ExpiryDate>
                    <TransportationMode></TransportationMode>
                    <Vehicle></Vehicle>
                    <PickupDate></PickupDate>
                    <PickupTime></PickupTime>
                    <Source>PMS</Source>
                    <Comment></Comment>
                    <AffiliateName></AffiliateName>
                    <AffiliateCode></AffiliateCode>
                    <CCLink></CCLink>
                    <CCNo></CCNo>
                    <CCType></CCType>
                    <CCExpiryDate></CCExpiryDate>
                    <CardHoldersName></CardHoldersName>
                    <ExtraCharge>
                        <ChargeDate>2020-03-18</ChargeDate>
                        <ChargeCode></ChargeCode>
                        <ChargeName>Call Charges</ChargeName>
                        <ChargeDesc></ChargeDesc>
                        <Remark></Remark>
                        <Quantity>15</Quantity>
                        <AmountBeforeTax>15.00</AmountBeforeTax>
                        <Amount>15.00</Amount>
                    </ExtraCharge>
                    <RentalInfo>
                        <EffectiveDate>2020-03-18</EffectiveDate>
                        <PackageCode>894300000000000002</PackageCode>
                        <PackageName>All Inclusive</PackageName>
                        <RoomTypeCode>894300000000000001</RoomTypeCode>
                        <RoomTypeName>Studio</RoomTypeName>
                        <Adult>2</Adult>
                        <Child>2</Child>
                        <Rent>2950.00</Rent>
                        <RentBeforeTax>2500.00</RentBeforeTax>
                        <Discount>0.00</Discount>
                    </RentalInfo>
                    <RentalInfo>
                        <EffectiveDate>2020-03-19</EffectiveDate>
                        <PackageCode>894300000000000002</PackageCode>
                        <PackageName>All Inclusive</PackageName>
                        <RoomTypeCode>894300000000000001</RoomTypeCode>
                        <RoomTypeName>Studio</RoomTypeName>
                        <Adult>2</Adult>
                        <Child>2</Child>
                        <Rent>2950.00</Rent>
                        <RentBeforeTax>2500.00</RentBeforeTax>
                        <Discount>0.00</Discount>
                    </RentalInfo>
                    <Sharer>
                        <Salutation>Mam.</Salutation>
                        <FirstName>Maya</FirstName>
                        <LastName></LastName>
                        <Gender>Female</Gender>
                        <DateOfBirth></DateOfBirth>
                        <SpouseDateOfBirth></SpouseDateOfBirth>
                        <WeddingAnniversary></WeddingAnniversary>
                        <Nationality>India</Nationality>
                        <Address></Address>
                        <City></City>
                        <State></State>
                        <Country>India</Country>
                        <Zipcode></Zipcode>
                        <Phone></Phone>
                        <Mobile></Mobile>
                        <Fax></Fax>
                        <Email></Email>
                        <IdentiyType>Aadhar card</IdentiyType>
                        <IdentityNo>789456123</IdentityNo>
                        <ExpiryDate></ExpiryDate>
                    </Sharer>
                </BookingTran>
            </BookByInfo>
        </Reservation>
        <CancelReservation>
             <LocationId>8943</LocationId>
             <UniqueID>206-1</UniqueID>
             <Remark>Cancel,Guest want to cancel reservation through Agoda</Remark>
             <VoucherNo>12314986/1</VoucherNo>
        </CancelReservation>
        <CancelReservation>
             <LocationId>8943</LocationId>
             <UniqueID>206-2</UniqueID>
             <Remark>Cancel,Guest want to cancel reservation through Agoda</Remark>
             <VoucherNo>12314944/2</VoucherNo>
         </CancelReservation>
         <CancelReservation>
              <LocationId>8943</LocationId>
              <UniqueID>207</UniqueID>
              <Remark>Cancel,Guest want to cancel reservation through Agoda</Remark>
              <VoucherNo>123149844/1</VoucherNo>
         </CancelReservation>
         <CancelReservation>
              <LocationId>8943</LocationId>
              <UniqueID>200</UniqueID>
              <Remark>Cancel,Guest want to cancel reservation through Agoda</Remark>
              <VoucherNo>123149444</VoucherNo>
          </CancelReservation>
    </Reservations>
    <Errors>
        <ErrorCode>0</ErrorCode>
        <ErrorMessage>Success</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|                |                                                                         |
|----------------|-------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                          |
| 114            | Missing from date in some request                                       |
| 115            | Missing to date in some request                                         |
| 117            | From Date is not valid date                                             |
| 118            | To Date is not valid date                                               |
| 119            | Please check From and To date. To Date should be greater than From Date |
| 113            | Missing roomtype id in some request                                     |
| 400            | Invalid Request Format                                                  |
| 302            | Authentication failed                                                   |
| 303            | Auth Code is inactive.                                                  |
| 301            | Unauthorized request. Request is not valid for this hotel code          |
| 202            | Unauthorized request. Hotel code is not active                          |
| 111            | Invalid Request                                                         |
| 204            | Duplicate request. Please try again after 1 minute.                     |

---

### BKG-18 · Post Create Bookings Actions

**Request\_Type:** `ProcessBooking`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ProcessBooking&HotelCode=XXX&APIKey=XXX&Process_Data={`  ·  **eZee ref:** #762

*Tags: eZee Reservation Required, Meta Search*

This API helps you to process post [create bookings](https://api.ezeetechnosys.com/#755) actions in our system . The API can return data in JSON formats. The web service responds to HTTP GET requests.

You need to take **eZee Reservation** to use this API.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&Process_ Data=[PROCESS_DATA]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “ProcessBooking”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en.<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
<tr class="odd">
<td>Process_Data=&gt;Action</td>
<td>String</td>
<td>Action for booking</td>
<td>PendingBooking,<br />
FailBooking,<br />
ConfirmBooking</td>
</tr>
<tr class="even">
<td>Process_Data=&gt;ReservationNo</td>
<td>String</td>
<td>Reservation number</td>
<td>RES522</td>
</tr>
<tr class="odd">
<td>Process_Data=&gt;Inventory_Mode</td>
<td>String</td>
<td>Mode of inventory</td>
<td>ALLOCATED,<br />
REGULAR</td>
</tr>
<tr class="even">
<td>Process_Data=&gt;Error_Text</td>
<td>String</td>
<td>Error text</td>
<td></td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ProcessBooking&HotelCode=XXX&APIKey=XXX&Process_Data={"Action":"ConfirmBooking","ReservationNo":"RES522","Inventory_Mode":"XXX","Error_Text":""}

**Response**

|                     |               |                           |                                |
|---------------------|---------------|---------------------------|--------------------------------|
| **Name**            | **Data Type** | **Description**           | **Example**                    |
| Success.SuccessMsg  | –             | Generate Success Response | Booking processed Successfully |
| Errors.ErrorCode    | –             | Response Error Code       | 301, 404 etc                   |
| Errors.ErrorMessage | –             | Generate Response Message | Reservation already processed  |

**Success**

``` json
{
"result":"success",
"message":"Booking Processed Succesfully"
}
```

**Error Codes**

|                             |                                                                                                                                                  |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**              | **Error Name**                                                                                                                                   |
| HotelCodeEmpty              | Hotel code is empty.                                                                                                                             |
| NORESACC                    | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ                   | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                           | Cannot Parse Request                                                                                                                             |
| 5                           | Recoverable Error. Equivalent to http 503.                                                                                                       |
| ReservationAlreadyProcessed | Reservation is already processed.                                                                                                                |
| ParametersMissing           | Missing parameters.                                                                                                                              |
| DBConnectError              | Database not connected.                                                                                                                          |
| -1                          | Booking Process Failure.                                                                                                                         |
| APIACCESSDENIED             | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing           | Missing parameters.                                                                                                                              |
| UnknownError                | Unknown Error                                                                                                                                    |
| 4                           | Timeout requested. Stops requests for the specified time.                                                                                        |
| ReservationNotExist         | Reservation No. does not exist. Please check.                                                                                                    |
| InvalidHotelCode            | Invalid Hotel code.Please check your property code.                                                                                              |
| BadRequest                  | Bad request type.                                                                                                                                |

---

### BKG-19 · Retrieve a Booking Based on Parameters

**Request\_Type:** `BookingList`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=BookingList&HotelCode=XXX&APIKey=XXX&arrival_from`  ·  **eZee ref:** #770

*Tags: Meta Search, Open*

This API provides you current room stats and booking information based on reservation date or arrival dates. The API can return data in JSON formats. The web service responds to HTTP GET requests.

You need to take **eZee Reservation** to use this API.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&created_ from=[CREATED_FROM]&created_to=[CREATED_TO]&EmailId=[Email]
```

**Header**

–

#### **Parameter**

|                     |               |                                    |                             |
|---------------------|---------------|------------------------------------|-----------------------------|
| **Name**            | **Data Type** | **Description**                    | **Example**                 |
| \[BaseUrl\] \*      | –             | Live server URL                    | <https://live.ipms247.com/> |
| \[Request_Type\] \* | –             | Use Keyword “BookingList”          |                             |
| \[Hotel_Code\] \*   | INT(11)       | Unique Hotel code                  | XXXX                        |
| \[API_KEY\] \*      | VARCHAR(300)  | Unique Authentication code         | XXXXXXXXXXXXXXXXX           |
| \[CREATED_FROM\] \* | Date          | Date Fromformat(yyyy-mm-dd)        | 2020-05-23                  |
| \[CREATED_TO\] \*   | Date          | Date Toformat(yyyy-mm-dd)          | 2020-05-30                  |
| ArrivalFrom         | Date          | ArrivalDate fromformat(yyyy-mm-dd) | 2020-05-22                  |
| ArrivalTo           | Date          | ArrivalDate Toformat(yyyy-mm-dd)   | 2020-05-30                  |
| \[Email\] \*        | VARCHAR(100)  | Booking EmailId                    | xxxxxx@xyz.com              |

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=BookingList&HotelCode=XXX&APIKey=XXX&arrival_from
    =XXX&arrival_to=XXX&EmailId=

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>ReservationNo</td>
<td>Integer(11)</td>
<td>Reservation Unique number</td>
<td>1</td>
</tr>
<tr class="odd">
<td>GuestName</td>
<td>String</td>
<td>Name of Guest</td>
<td>Mr.Jhonson</td>
</tr>
<tr class="even">
<td>ArrivalDate</td>
<td>Date</td>
<td>Date of arrival</td>
<td>2020-02-20</td>
</tr>
<tr class="odd">
<td>DepartureDate</td>
<td>Date</td>
<td>Date of Departure</td>
<td>2020-02-22</td>
</tr>
<tr class="even">
<td>CancelDate</td>
<td>Date</td>
<td>Date when Reservation is cancel</td>
<td>2020-02-10</td>
</tr>
<tr class="odd">
<td>ReservationDate</td>
<td>Date</td>
<td>Date when Reservation is created</td>
<td>2020-02-05</td>
</tr>
<tr class="even">
<td>Room</td>
<td>String</td>
<td>Room Name</td>
<td>Delux</td>
</tr>
<tr class="odd">
<td>ReservationGuarantee</td>
<td>String</td>
<td>Guarantee of reservation</td>
<td>Confirm booking</td>
</tr>
<tr class="even">
<td>Source</td>
<td>String</td>
<td>Source of reservation</td>
<td>web</td>
</tr>
<tr class="odd">
<td>VoucherNo</td>
<td>Integer(11)</td>
<td>Voucher number</td>
<td>1</td>
</tr>
<tr class="even">
<td>DueAmount</td>
<td>Decimal</td>
<td>Due Amount</td>
<td>12500</td>
</tr>
<tr class="odd">
<td>Deposit</td>
<td>Decimal</td>
<td>Deposit amount</td>
<td>0</td>
</tr>
<tr class="even">
<td>Status</td>
<td>String</td>
<td>Status of booking</td>
<td>Active</td>
</tr>
<tr class="odd">
<td>BookingStatus</td>
<td>String</td>
<td>Current Status of booking</td>
<td>Confirmed Reservation</td>
</tr>
<tr class="even">
<td>Transaction Status</td>
<td>String</td>
<td>Status of transaction</td>
<td>Complete Booking</td>
</tr>
<tr class="odd">
<td>Total Tax</td>
<td>Decimal</td>
<td>Total Tax amount</td>
<td>500</td>
</tr>
<tr class="even">
<td>TotalInclusiveTax</td>
<td>Decimal</td>
<td>Total Inclusive Tax Amount</td>
<td>1500</td>
</tr>
<tr class="odd">
<td>TotalExclusivTax</td>
<td>Decimal</td>
<td>Total Exclusive Amount</td>
<td>1000</td>
</tr>
<tr class="even">
<td>OtherRevenueExclusiveTax</td>
<td>Decimal</td>
<td>Other Revenue tax exclusive amount</td>
<td>1200</td>
</tr>
<tr class="odd">
<td>OtherRevenueInclusiveTax</td>
<td>Decimal</td>
<td>Other Revenue tax inclusive amount</td>
<td>1500</td>
</tr>
<tr class="even">
<td>FolioNo</td>
<td>String</td>
<td>Folio NUmber</td>
<td>A123</td>
</tr>
<tr class="odd">
<td><br />
<strong>BaseRateExclusiveTax, BaseRateInclusiveTax</strong></td>
<td></td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>TransactionDate</td>
<td>Date</td>
<td>Date of transaction</td>
<td></td>
</tr>
<tr class="odd">
<td>ChargeName</td>
<td>String</td>
<td>Name of charge</td>
<td></td>
</tr>
<tr class="even">
<td>ChargeAmount</td>
<td>Decimal</td>
<td>Charge amount</td>
<td></td>
</tr>
</tbody>
</table>

**Success**

``` json
{
    "SearchCriteria": {
        "arrival_from": "2020-03-15",
        "arrival_to": "2020-05-30"
    },
    "RoomList": {
        "TotalActiveRoomInHotel": 1155,
        "TotalBlockRooms": 0,
        "TotalOccupiedRooms": 8
    },
    "BookingList": [
        {
            "ReservationNo": "RV506",
            "GuestName": "Mr. Anis",
            "ArrivalDate": "2020-05-08",
            "DepartureDate": "2020-05-12",
            "CancelDate": "",
            "ReservationDate": "2020-05-08",
            "Room": "Garden View",
            "RoomShortCode": "GV",
            "ReservationGuarantee": "Confirm Booking",
            "Source": "Ajay Tours and Travels",
            "VoucherNo": "-",
            "Mobile": "-",
            "Address": "",
            "Email": "nishit.vankawala@ezeetechnosys.com",
            "Country": "India",
            "Adult": "1",
            "Child": "0",
            "Phone": "-",
            "NoOfGuest": 1,
            "NoOfNights": "4",
            "salutation": "Mr.",
            "FirstName": "Anis",
            "LastName": "",
            "DueAmount": 13200,
            "Deposit": 0,
            "Status": "Active",
            "BookingStatus": "Confirmed Reservation",
            "TransactionStatus": "Complete Booking",
            "Total Tax": 1345.44,
            "TotalInclusiveTax": 13200,
            "TotalExclusivTax": 11854.56,
            "OtherRevenueExclusiveTax": 2000,
            "OtherRevenueInclusiveTax": 2360,
            "FolioNo": "GF759",
            "BaseRateExclusiveTax": {
                "2020-05-08": 2463.64,
                "2020-05-09": 2463.64,
                "2020-05-10": 2463.64,
                "2020-05-11": 2463.64
            },
            "BaseRateInclusiveTax": {
                "2020-05-08": 2710,
                "2020-05-09": 2710,
                "2020-05-10": 2710,
                "2020-05-11": 2710
            },
            "ExtraCharges": {
                "2020-05-08": [
                    {
                        "TransactionDate": "2020-05-08",
                        "ChargeName": "Pool's",
                        "ChargeAmount": "500.0000"
                    },
                    {
                        "TransactionDate": "2020-05-08",
                        "ChargeName": "CGST@6%",
                        "ChargeAmount": "90.0000"
                    }
                ],
                "2020-05-09": [
                    {
                        "TransactionDate": "2020-05-09",
                        "ChargeName": "Pool's",
                        "ChargeAmount": "500.0000"
                    },
                    {
                        "TransactionDate": "2020-05-09",
                        "ChargeName": "CGST@6%",
                        "ChargeAmount": "90.0000"
                    }
                ],
                "2020-05-10": [
                    {
                        "TransactionDate": "2020-05-10",
                        "ChargeName": "Pool's",
                        "ChargeAmount": "500.0000"
                    },
                    {
                        "TransactionDate": "2020-05-10",
                        "ChargeName": "CGST@6%",
                        "ChargeAmount": "90.0000"
                    }
                ],
                "2020-05-11": [
                    {
                        "TransactionDate": "2020-05-11",
                        "ChargeName": "Pool's",
                        "ChargeAmount": "500.0000"
                    },
                    {
                        "TransactionDate": "2020-05-11",
                        "ChargeName": "CGST@6%",
                        "ChargeAmount": "90.0000"
                    }
                ]
            }
        }
    ]
}
```

**Error Codes**

|                        |                                                                                                                                                  |
|------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**         | **Error Name**                                                                                                                                   |
| HotelCodeEmpty         | Hotel code is empty.                                                                                                                             |
| NORESACC               | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ              | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                      | Cannot Parse Request                                                                                                                             |
| 5                      | Recoverable Error. Equivalent to http 503.                                                                                                       |
| CheckDate              | Check out date should be greater than Check in date                                                                                              |
| DBConnectError         | Database not connected.                                                                                                                          |
| BookingListLimitExceed | You can not request data of more than 365 days.                                                                                                  |
| -1                     | No Data found.                                                                                                                                   |
| APIACCESSDENIED        | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing      | Missing parameters.                                                                                                                              |
| UnknownError           | Unknown Error                                                                                                                                    |
| 4                      | Timeout requested. Stops requests for the specified time.                                                                                        |
| InvalidHotelCode       | Invalid Hotel code.Please check your property code.                                                                                              |
| BadRequest             | Bad request type.                                                                                                                                |
| getBookingListError    | Booking List error                                                                                                                               |

---

### BKG-20 · Read a Booking

**Request\_Type:** `ReadBooking`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ReadBooking&HotelCode=XXXX&APIKey=XXXXXXXXXXXXXXXXX&language=en&ResNo=3`  ·  **eZee ref:** #774

*Tags: eZee Reservation Required, Meta Search*

This API helps you to read booking details for a given booking ID. The API can return data in JSON formats. The web service responds to HTTP GET requests.

You need to take **eZee Reservation** to use this API.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&ResNo=[ResNo]
```

**Header**

–

#### **Parameter**

|                     |               |                            |                             |
|---------------------|---------------|----------------------------|-----------------------------|
| **Name**            | **Data Type** | **Description**            | **Example**                 |
| \[BaseUrl\] \*      | –             | Live server URL            | <https://live.ipms247.com/> |
| \[Request_Type\] \* | –             | Use Keyword “ReadBooking”  |                             |
| \[Hotel_Code\] \*   | INT(11)       | Unique Hotel code          | XXXX                        |
| \[API_KEY\] \*      | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX           |
| \[ResNo\] \*        | INT(11)       | Reservation number         | 1                           |

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ReadBooking&HotelCode=XXXX&APIKey=XXXXXXXXXXXXXXXXX&language=en&ResNo=3

**Response**

|                      |               |                                                                                                              |                      |
|----------------------|---------------|--------------------------------------------------------------------------------------------------------------|----------------------|
| **Name**             | **Data Type** | **Description**                                                                                              | **Example**          |
| ReservationNo        | Integer(11)   | Reservation Unique number                                                                                    | 1                    |
| Subreservation_No    | Integer(11)   | Sub Reservation Number                                                                                       | xxxx                 |
| Transaction_Id       | Integer(20)   | Unique Transaction id                                                                                        | xxxxxxxxxxx          |
| StatusUnkId          | Integer(20)   | Status unique id. Status description is available [here](https://api.ezeetechnosys.com/#section-statuscode). | xxxx                 |
| Businesssource       | String        | Source of business                                                                                           | web                  |
| Market               | String        |                                                                                                              |                      |
| Travelagent          | String        |                                                                                                              |                      |
| PaymentType          | String        | Type of payment                                                                                              | Cash                 |
| Address              | String        | Address                                                                                                      |                      |
| City                 | String        | Name of City                                                                                                 | New York             |
| State                | String        | State name                                                                                                   | New York             |
| Country              | String        | Country name                                                                                                 | USA                  |
| Zipcode              | Integer(11)   | zipcode                                                                                                      | 123456               |
| Phone                | Integer(20)   | Phone number                                                                                                 | 1234567890           |
| Mobile               | Integer(20)   | Mobile Number                                                                                                | 1234567890           |
| Fax                  | Integer(20)   | Fax number                                                                                                   | 1234567890           |
| Email                | String        | Email id                                                                                                     | abc@xyz.com          |
| VehicleNo            | String        | Vehicle number                                                                                               | 1234                 |
| PickupDatetime       | DateTime      | DateTime of Pickup                                                                                           | 2020-05-05 12:12:00  |
| IdentityType         | String        | Type of Identity proof                                                                                       | Passport             |
| IdentityNo           | String        | Identity type number                                                                                         | 123456789            |
| Nationality          | String        | Nationality of guest                                                                                         | American             |
| BirthDate            | Date          | Date of Birth                                                                                                | 1980-05-05           |
| ExpiryDate           | Date          | Expiry Date                                                                                                  | 2022-05-02           |
| ArrivalBy            | String        | Arrival by                                                                                                   | car                  |
| DepartureBy          | String        | Departure by                                                                                                 | car                  |
| DropOffDatetime      | Datetime      | Drop of datetime                                                                                             | 2020-02-020 12:12:00 |
| DeptVehicleNo        | String        | Departure vehicle number                                                                                     | Abc-8989             |
| Ownership            | Integer(1)    | Owernership                                                                                                  | 0 or 1               |
| GroupId              | Integer(20)   | Group id                                                                                                     | Xxxxxxxxxxxx         |
| ArrivalDate          | Date          | Date of arrival                                                                                              | 2020-01-01           |
| DepartureDate        | Date          | Departure date                                                                                               | 2020-01-05           |
| No_of_Nights         | Integer       | No of night                                                                                                  | 3                    |
| Salutation           | String        | Salutation                                                                                                   | Mr                   |
| First_Name           | String        | First name                                                                                                   | Jhon                 |
| Last_Name            | String        | Last name                                                                                                    | tye                  |
| Room_Type            | String        | Type of room                                                                                                 | suite                |
| Rate_Type            | String        | Type of rate                                                                                                 | daily                |
| ReservationGuarantee | String        | Guarantee of reservation                                                                                     | Confirm reservation  |
| Adult                | Integer(11)   | Number of adult                                                                                              | 2                    |
| Child                | Integer(11)   | Number of child                                                                                              | 0                    |
| Total                | Decimal       | Total amount                                                                                                 | 25500                |
| Guestunkid           | Integet(20)   | Guest unique Id                                                                                              | xxxxxxxxxxxx         |
| Confirmed_Type       | Integer(1)    | Confirm type                                                                                                 | 1                    |

**Success**

``` json
[{
"Reservation_No": "KHT822",
"Subreservation_No": "",
"Transaction_Id": "110600000000000880",
"StatusUnkId": "6",
"Businesssource": "",
"Market": "",
"Travelagent": "",
"PaymentType": null,
"Address": "Surat",
"City": "Surat",
"State": "Gujarat",
"Zipcode": "960050",
"Country": "India",
"Phone": "9825230",
"Mobile": "9856741230",
"Fax": "968572202",
"Email": "",
"VehicleNo": "CAR",
"PickupDatetime": "2018-01-16 03:00:00",
"IdentityType": "Passport",
"IdentityNo": "963852",
"Nationality": "India",
"BirthDate": "1998-01-01 00:00:00",
"ExpiryDate": "2021-01-01 00:00:00",
"ArrivalBy": "car",
"DepartureBy": "car",
"DropOffDatetime": "2018-01-18 03:30:00",
"DeptVehicleNo": "CAR",
"Ownership": "0",
"GroupId": "0",
"ArrivalDate": "2018-01-05 10:00:00",
"DepartureDate": "2018-01-06 12:00:00",
"No_of_Nights": "1",
"Salutation": "Jn.",
"First_Name": "45435",
"Last_Name": "",
"Room_Type": "Penthouse",
"Rate_Type": "weekly",
"ReservationGuarantee": "Confirm Booking",
"Adult": "1",
"Child": "0",
"Total": "0.0000",
"Guestunkid": "110600000000000558",
"Confirmed_Type": "1"
}]
```

**Error Codes**

|                     |                                                                                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**      | **Error Name**                                                                                                                                   |
| HotelCodeEmpty      | Hotel code is empty.                                                                                                                             |
| NORESACC            | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ           | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                   | Cannot Parse Request                                                                                                                             |
| 5                   | Recoverable Error. Equivalent to http 503.                                                                                                       |
| CheckDate           | Check out date should be greater than Check in date                                                                                              |
| DBConnectError      | Database not connected.                                                                                                                          |
| InvalidData         | Please check data passed.                                                                                                                        |
| -1                  | No Data found.                                                                                                                                   |
| APIACCESSDENIED     | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing   | Missing parameters.                                                                                                                              |
| UnknownError        | Unknown Error                                                                                                                                    |
| 4                   | Timeout requested. Stops requests for the specified time.                                                                                        |
| InvalidHotelCode    | Invalid Hotel code.Please check your property code.                                                                                              |
| BadRequest          | Bad request type.                                                                                                                                |
| ReservationNotExist | Reservation No. does not exist. Please check.                                                                                                    |

---

### BKG-21 · Cancel a Booking

**Request\_Type:** `CancelBooking`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=CancelBooking&HotelCode=xxxx&APIKey=xxxxxxxxxxxxxxxx&language=en&ResNo=167&SubNo=&language=en`  ·  **eZee ref:** #777

*Tags: Meta Search, Open*

This API helps you to cancel bookings in our system. The API can return data in JSON formats. The web service responds to HTTP GET requests.

You need to take **eZee Reservation** to use this API.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&ResNo=[ResNo]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “CancelBooking”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[ResNo] *</td>
<td>INT(11)</td>
<td>Reservation number</td>
<td>1</td>
</tr>
<tr class="odd">
<td>SubNo</td>
<td>INT(11)</td>
<td>SubReservation Unique number</td>
<td>1</td>
</tr>
<tr class="even">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en. <br />
<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=CancelBooking&HotelCode=xxxx&APIKey=xxxxxxxxxxxxxxxx&language=en&ResNo=167&SubNo=&language=en

**Response**

|                     |               |                           |                                |
|---------------------|---------------|---------------------------|--------------------------------|
| **Name**            | **Data Type** | **Description**           | **Example**                    |
| Success.SuccessMsg  | –             | Generate Success Response | Booking processed Successfully |
| Errors.ErrorCode    | –             | Response Error Code       | 301, 404 etc                   |
| Errors.ErrorMessage | –             | Generate Response Message | Reservation already processed  |

**Success**

``` json
{“status”:”Successful”}
```

**Error Codes**

|                     |                                                                                                                                                  |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**      | **Error Name**                                                                                                                                   |
| HotelCodeEmpty      | Hotel code is empty.                                                                                                                             |
| NORESACC            | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ           | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                   | Cannot Parse Request                                                                                                                             |
| 5                   | Recoverable Error. Equivalent to http 503.                                                                                                       |
| CheckDate           | Check out date should be greater than Check in date                                                                                              |
| DBConnectError      | Database not connected.                                                                                                                          |
| InvalidData         | Please check data passed.                                                                                                                        |
| -1                  | No Data found.                                                                                                                                   |
| APIACCESSDENIED     | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing   | Missing parameters.                                                                                                                              |
| UnknownError        | Unknown Error                                                                                                                                    |
| 4                   | Timeout requested. Stops requests for the specified time.                                                                                        |
| InvalidHotelCode    | Invalid Hotel code.Please check your property code.                                                                                              |
| BadRequest          | Bad request type.                                                                                                                                |
| ReservationNotExist | Reservation No. does not exist. Please check.                                                                                                    |

---

### BKG-22 · Autosync Future Bookings and its modifications

**Method:** GET  ·  **eZee ref:** #1533

*Tags: RMS*

With this push mechanism, we will be sending the latest booking updates to your end point. We will be calling your end point every 5 minutes based on bookings inflow you have in your property. The data will be sent in XML format.

This mechanism is basically used to keep your revenue management systems updated. So after syncing [historical bookings](https://api.ezeetechnosys.com/#751) for the first time, you can get this mechanism activated so our system will keep pushing you latest timely updates thereby keeping your system up-to date.

**Push bookings data will be in below format**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>LocationId</td>
<td>INT(11)</td>
<td>Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>UniqueID</td>
<td>VARCHAR(255)</td>
<td>Unique Booking id</td>
<td>10125, 86436, B4525 etc</td>
</tr>
<tr class="even">
<td>BookedBy</td>
<td>VARCHAR(255)</td>
<td>Information regarding Booked by</td>
<td>Booking.com etc</td>
</tr>
<tr class="odd">
<td>Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email.</td>
<td>VARCHAR(255)</td>
<td>Here * denotes guest information like Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email.</td>
<td>shown in JSON response below.</td>
</tr>
<tr class="even">
<td>BusinessSource</td>
<td>VARCHAR(100)</td>
<td>Business Source Name</td>
<td>Booking.com</td>
</tr>
<tr class="odd">
<td>Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Expedia</td>
</tr>
<tr class="even">
<td>PaymentMethod</td>
<td>VARCHAR(255)</td>
<td>Payment Mode selected by guest</td>
<td>Cash, Credit, CityLedger etc</td>
</tr>
<tr class="odd">
<td>IsChannelBooking</td>
<td>INT(1)</td>
<td>Is booking comes from channel [0 or 1]<br />
1 : Booking from the channel.<br />
0: Booking not from the channel.</td>
<td>0 or 1</td>
</tr>
<tr class="even">
<td>BookingTran. SubBookingId</td>
<td>VARCHAR(255)</td>
<td>Sub booking Id</td>
<td>138</td>
</tr>
<tr class="odd">
<td>BookingTran. TransactionId</td>
<td>INT(20)</td>
<td>Booking Transaction ID</td>
<td>112500000000000163</td>
</tr>
<tr class="even">
<td>BookingTran. Status</td>
<td>VARCHAR(1000)</td>
<td>Booking Status</td>
<td>New or Modify or Cancel.</td>
</tr>
<tr class="odd">
<td>BookingTran.I sConfirmed</td>
<td>INT(1)</td>
<td>Booking Confirmation Flag. [1 or 0]<br />
1 : Confirmed<br />
0 : Not Confirmed</td>
<td>1 or 0.</td>
</tr>
<tr class="even">
<td>BookingTran. VoucherNo</td>
<td>VARCHAR(255)</td>
<td>Booking Voucher No</td>
<td>10203049/8512</td>
</tr>
<tr class="odd">
<td>BookingTran. PackageCode</td>
<td>INT(20)</td>
<td>Package Code</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>BookingTran. PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RateplanCode</td>
<td>INT(20)</td>
<td>Unique RatePlan Code</td>
<td>112500000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RateplanName</td>
<td>STRING(1000)</td>
<td>RatePlan Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran. RoomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>112500000000000006</td>
</tr>
<tr class="even">
<td>BookingTran. RoomTypeName</td>
<td>STRING(1000)</td>
<td>RoomType Name</td>
<td>Garden View Studio Room</td>
</tr>
<tr class="odd">
<td>BookingTran. Start</td>
<td>DATE</td>
<td>Check-in date[Format : yyyy-mm-dd]</td>
<td>2017-12-25</td>
</tr>
<tr class="even">
<td>BookingTran. End</td>
<td>DATE</td>
<td>Check-out date [Format : yyyy-mm-dd]</td>
<td>2017-12-27</td>
</tr>
<tr class="odd">
<td>BookingTran.TotalRate</td>
<td>DECIMAL(19,4)</td>
<td>Rate on room in amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran.</td>
<td>DECIMAL(19,4)</td>
<td>Discount on room in</td>
<td>500</td>
</tr>
<tr class="odd">
<td>TotalDiscount</td>
<td></td>
<td>amount</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran. TotalExtraCharge</td>
<td>DECIMAL(19,4)</td>
<td>Extra charges in amount(if any)</td>
<td>300</td>
</tr>
<tr class="odd">
<td>BookingTran. TotalPayment</td>
<td>DECIMAL(19,4)</td>
<td>Payment for room in amount</td>
<td>2500.54</td>
</tr>
<tr class="even">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes guest informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,IdentityType, IdentityNo, ExpiryDate.</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. TransportationMode</td>
<td>VARCHAR(100)</td>
<td>Mode of transportation</td>
<td>Bus, car etc</td>
</tr>
<tr class="even">
<td>BookingTran. Vehicle</td>
<td>VARCHAR(255)</td>
<td>Detail of vehicle</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. PickupDate</td>
<td>DATE</td>
<td>Pickup date[Format : yyyy-mm-dd]</td>
<td>2017-12-25 etc</td>
</tr>
<tr class="even">
<td>BookingTran. PickupTime</td>
<td>TIME</td>
<td>Pickup time</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. Source</td>
<td>VARCHAR(1000)</td>
<td>Booking generated source</td>
<td>Expedia</td>
</tr>
<tr class="even">
<td>BookingTran. Comment</td>
<td>VARCHAR(1000)</td>
<td>Additional Information or comment.</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran. AffiliateName</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Name</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran.AffiliateCode</td>
<td>VARCHAR(1000)</td>
<td>Booking Affiliate Code</td>
<td></td>
</tr>
<tr class="odd">
<td>BookingTran.*</td>
<td>–</td>
<td>Here * denotes Credit Card Informations like CCLink, CCNo, CCType,CardHolderName, CCExpiryDate,</td>
<td></td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.EffectiveDate</td>
<td>DATETIME</td>
<td>Booking details for particular effective date</td>
<td>2017-12-25 etc</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.PackageCode</td>
<td>INT(20)</td>
<td>Package code</td>
<td>112500000000000001</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.PackageName</td>
<td>VARCHAR(1000)</td>
<td>Package Name</td>
<td>European Plan</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.R oomTypeCode</td>
<td>INT(20)</td>
<td>Unique RoomType Code</td>
<td>112500000000000006</td>
</tr>
<tr class="even">
<td>BookingTran.RentalInfo.R oomTypeName</td>
<td>TEXT</td>
<td>RoomType Name</td>
<td>Grand Sea View Junior Suite</td>
</tr>
<tr class="odd">
<td>BookingTran.RentalInfo.Adult</td>
<td>INT(11)</td>
<td>No. of Adults</td>
<td>2,3,4 etc</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Child</td>
<td>INT(11)</td>
<td>No. of Childs</td>
<td>2,3,4 etc</td>
</tr>
<tr class="odd">
<td>BookingTran. RentalInfo.Rent</td>
<td>DECIMAL(19,4)</td>
<td>Room rental amount</td>
<td>1500.43</td>
</tr>
<tr class="even">
<td>BookingTran. RentalInfo.Discount</td>
<td>DECIMAL(19,4)</td>
<td>Discount on rental room in amount</td>
<td>500</td>
</tr>
<tr class="odd">
<td>Errors.ErrorCode</td>
<td>–</td>
<td>Response Error Code</td>
<td>104, 404 etc</td>
</tr>
<tr class="even">
<td>Errors.ErrorMessage</td>
<td>–</td>
<td>Generate Response Message</td>
<td>Unauthorized Request. etc</td>
</tr>
</tbody>
</table>

**Booking XML**

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
  <Reservations>
    <Reservation>
      <BookByInfo>
        <LocationId>1088</LocationId>
        <UniqueID>4001</UniqueID>
        <BookedBy>Expedia</BookedBy>
        <Salutation />
        <FirstName>Guest</FirstName>
        <LastName>Bhuyan</LastName>
        <Gender />
        <Address />
        <City />
        <State />
        <Country />
        <Zipcode />
        <Phone />
        <Mobile />
        <Fax />
        <Email />
        <BusinessSource>Booking.com</BusinessSource>
        <Source>Expedia</Source>
        <IsChannelBooking>1</IsChannelBooking>
        <BookingTran>
          <SubBookingId>4001</SubBookingId>
          <TransactionId>1088000000000059</TransactionId>
          <Createdatetime>2019-07-23 1245:21</Createdatetime>
          <Modifydatetime>2019-07-23 1245:21</Modifydatetime>
          <Status>New</Status>
          <IsConfirmed>1</IsConfirmed>
          <VoucherNo>12563894/1</VoucherNo>
          <PackageCode>12</PackageCode>
          <PackageName>EP Single</PackageName>
          <RateplanCode>31</RateplanCode>
          <RateplanName>Elite Single Room</RateplanName>
          <RoomTypeCode>01</RoomTypeCode>
          <RoomTypeName>Elite Room</RoomTypeName>
          <Start>2019-07-23</Start>
          <End>2019-07-27</End>
          <CurrencyCode>INR</CurrencyCode>
          <TotalRate>15245.60</TotalRate>
          <TotalAmountAfterTax>15245.60</TotalAmountAfterTax>
          <TotalAmountBeforeTax>12920.00</TotalAmountBeforeTax>
          <TotalTax>2325.60</TotalTax>
          <TotalDiscount>0.00</TotalDiscount>
          <TotalExtraCharge>0.00</TotalExtraCharge>
          <TotalPayment>0.00</TotalPayment>
          <TACommision>0.00</TACommision>
          <Salutation />
          <FirstName>Pranjit</FirstName>
          <LastName>Bhuyan</LastName>
          <Gender>Other</Gender>
          <DateOfBirth />
          <SpouseDateOfBirth />
          <WeddingAnniversary />
          <Nationality />
          <Address />
          <City />
          <State />
          <Country />
          <Zipcode />
          <Phone />
          <Mobile />
          <Fax />
          <Email />
          <IdentiyType />
          <IdentityNo />
          <ExpiryDate />
          <TransportationMode />
          <Vehicle />
          <PickupDate />
          <PickupTime />
          <Source>Expedia</Source>
          <Comment>Reservation : Reservation : Cancellation Policy Free cancellation if cancelled between 365 days prior to checkin and 1 days prior to checkinNon-Refundable between 1 days prior to checkin or in case of NO SHOWPay at Hotel: False</Comment>
          <AffiliateName />
          <AffiliateCode />
          <CCLink />
          <CCNo />
          <CCType />
          <CCExpiryDate />
          <CardHoldersName />
          <RentalInfo>
            <EffectiveDate>2019-07-23</EffectiveDate>
            <PackageCode>12</PackageCode>
            <PackageName>EP Single</PackageName>
            <RoomTypeCode>01</RoomTypeCode>
            <RoomTypeName>Elite Room</RoomTypeName>
            <Adult>2</Adult>
            <Child>0</Child>
            <Rent>3811.40</Rent>
            <RentBeforeTax>3230.00</RentBeforeTax>
            <Discount>0.00</Discount>
          </RentalInfo>
          <RentalInfo>
            <EffectiveDate>2019-07-24</EffectiveDate>
            <PackageCode>12</PackageCode>
            <PackageName>EP Single</PackageName>
            <RoomTypeCode>01</RoomTypeCode>
            <RoomTypeName>Elite Room</RoomTypeName>
            <Adult>2</Adult>
            <Child>0</Child>
            <Rent>3811.40</Rent>
            <RentBeforeTax>3230.00</RentBeforeTax>
            <Discount>0.00</Discount>
          </RentalInfo>
          <RentalInfo>
            <EffectiveDate>2019-07-25</EffectiveDate>
            <PackageCode>12</PackageCode>
            <PackageName>EP Single</PackageName>
            <RoomTypeCode>01</RoomTypeCode>
            <RoomTypeName>Elite Room</RoomTypeName>
            <Adult>2</Adult>
            <Child>0</Child>
            <Rent>3811.40</Rent>
            <RentBeforeTax>3230.00</RentBeforeTax>
            <Discount>0.00</Discount>
          </RentalInfo>
          <RentalInfo>
            <EffectiveDate>2019-07-26</EffectiveDate>
            <PackageCode>12</PackageCode>
            <PackageName>EP Single</PackageName>
            <RoomTypeCode>01</RoomTypeCode>
            <RoomTypeName>Elite Room</RoomTypeName>
            <Adult>2</Adult>
            <Child>0</Child>
            <Rent>3811.40</Rent>
            <RentBeforeTax>3230.00</RentBeforeTax>
            <Discount>0.00</Discount>
          </RentalInfo>
        </BookingTran>
      </BookByInfo>
    </Reservation>    
  </Reservations>
  <Errors>
    <ErrorCode>0</ErrorCode>
    <ErrorMessage>Success</ErrorMessage>
  </Errors>
</RES_Response>
```

**You need to send us booking received notification in below format**

|               |               |                   |                         |
|---------------|---------------|-------------------|-------------------------|
| **Name**      | **Data Type** | **Description**   | **Example**             |
| BookingId     | INT(11)       | Unique Booking id | 10125, 86436, B4525 etc |
| PMS_BookingId | INT(11)       | PMS Booking id    | 10125, 86436, B4525 etc |

**Success**

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
  <Success>
    <Booking>
        <BookingId>[Booking Id]</BookingId>
        <PMS_BookingId>[PMS Booking Id]</PMS_BookingId>
    </Booking>
  </Success>  
  <Errors>
    <ErrorCode>200</ErrorCode>
    <ErrorMessage>Success</ErrorMessage>
  </Errors>
</RES_Response>
```

**Error**

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>   
  <Errors>
    <ErrorCode>500</ErrorCode>
    <ErrorMessage>Booking not inserted</ErrorMessage>
  </Errors>
</RES_Response>
```

---

### BKG-23 · Guest Data Update

**Request\_Type:** `UploadDocument`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2064

*Tags: Kiosk Connectivity, Open*

This API helps you to update guest data (name, phone, mobile, email, etc) and upload documents (guest identity, guest signature, guest image, and voucher image). The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/](https://live.ipms247.com/pmsinterface/pms_connectivity.php)[index.php/page/service.kioskconnectivity](http://192.168.20.37/index.php/page/service.kioskconnectivity)

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Request_Type*</td>
<td>VARCHAR(100)</td>
<td>Request Type</td>
<td>UploadDocument</td>
</tr>
<tr class="odd">
<td>BookingId*</td>
<td>VARCHAR(255)</td>
<td>Unique Booking Id/Reservation No</td>
<td>456</td>
</tr>
<tr class="even">
<td>FirstName*</td>
<td>VARCHAR(500)</td>
<td>First Name</td>
<td>Torben</td>
</tr>
<tr class="odd">
<td>LastName*</td>
<td>VARCHAR(500)</td>
<td>Last Name</td>
<td>L. Schou</td>
</tr>
<tr class="even">
<td>Email*</td>
<td>VARCHAR(255)</td>
<td>Email Id</td>
<td>abc@xyz.com</td>
</tr>
<tr class="odd">
<td>UpdateSinglebooking</td>
<td>INT(11)</td>
<td><strong>It is an optional field</strong> but please set 1 If you want to update guest data for a single booking.</td>
<td>Value : 1 or 0<br />
For ex:<br />
Group Booking: 150<br />
No of Booking: 2<br />
ResNo = 150-1 | Guest = Mr Sanjay<br />
ResNo = 150-2 | Guest = Mr Sanjay<br />
<br />
-&gt; If you want to update ResNo = 150-2 and Mr. Sanjay to Mr. Bharat, you can do it using this parameter.<br />
</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;Salutation</td>
<td>VARCHAR(100)</td>
<td>Salutation</td>
<td>Mr</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;FirstName</td>
<td>VARCHAR(500)</td>
<td>For Update First Name</td>
<td>Torben</td>
</tr>
<tr class="even">
<td>UpdateGuestDat-&gt;LastName</td>
<td>VARCHAR(500)</td>
<td>For Update Last Name</td>
<td>L. Schou</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;Gender</td>
<td>VARCHAR(25)</td>
<td>For Update Gender</td>
<td>Male</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;Type</td>
<td></td>
<td>For Update Type (Adult/Child)</td>
<td>Aduit</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;DateOfBirth</td>
<td>DATE</td>
<td>Date Of Birth</td>
<td>1985-05-05</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;SpouseDateOfBirth</td>
<td>DATE</td>
<td>Spouse Date Of Birth</td>
<td>1987-01-25</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;WeddingAnniversary</td>
<td>DATE</td>
<td>Wedding Anniversary Date</td>
<td>1987-10-05</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;Address</td>
<td>VARCHAR(4000)</td>
<td>Address</td>
<td>500 Kingston</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;City</td>
<td>VARCHAR(255)</td>
<td>Name of City</td>
<td>Toronto</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;State</td>
<td>VARCHAR(255)</td>
<td>State name</td>
<td>Ontario</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;Country</td>
<td>VARCHAR(255)</td>
<td>Country name</td>
<td>Canada<br />
(for country <a href="https://api.ezeetechnosys.com/#589">https://api.ezeetechnosys.com/#589</a>)</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;Nationality</td>
<td>VARCHAR(255)</td>
<td>Nationality</td>
<td>India<br />
(for country <a href="https://api.ezeetechnosys.com/#589">https://api.ezeetechnosys.com/#589</a>)</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;Zipcode</td>
<td>Integer(11)</td>
<td>zip code</td>
<td>123456</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;Phone</td>
<td>Integer(20)</td>
<td>Phone number</td>
<td>1234567890</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;Mobile</td>
<td>Integer(20)</td>
<td>Mobile Number</td>
<td>1234567890</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;Fax</td>
<td>Integer(20)</td>
<td>Fax number</td>
<td>1234567890</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;Email</td>
<td>VARCHAR(255)</td>
<td>Email id </td>
<td>abc@xyz.com</td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;RegistrationNo</td>
<td>VARCHAR(255)</td>
<td>Registration Number</td>
<td>12345</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;IdentityTypeID</td>
<td>BIGINT(20)</td>
<td>Identity Unique Id</td>
<td>1234500000000000001<br />
(To get this ID, please check API [Retrieve Identity Type])<br />
<a href="https://api.ezeetechnosys.com/#2059">https://api.ezeetechnosys.com/#2059</a></td>
</tr>
<tr class="even">
<td>UpdateGuestData-&gt;IdentityNo</td>
<td>VARCHAR(255)</td>
<td>Identity type number</td>
<td>123456789</td>
</tr>
<tr class="odd">
<td>UpdateGuestData-&gt;ExpiryDate</td>
<td>DATE</td>
<td>Expiry Date</td>
<td>2022-05-02</td>
</tr>
<tr class="even">
<td>Documents-&gt;Type</td>
<td>Integer(1)</td>
<td>Type Of Document Upload</td>
<td>1 = Identity, 2 = Signature, 3 = Guest Image, 4 = Guest Vouchers</td>
</tr>
<tr class="odd">
<td>Documents-&gt;Images</td>
<td>String</td>
<td>Encoded Image String</td>
<td>Alpha-numeric String</td>
</tr>
</tbody>
</table>

**Request **

    1.For Single Booking Request
    {
            "RES_Request": {
            "Request_Type": "UploadDocument",
            "Authentication": {
                    "HotelCode": "xxxx",
                    "AuthCode": "xxxxxxxxxxxx"
            },
            "Reservation": [
                {
                    "BookingId": "123",  
                    "GuestDetails": [
                        {
                            "FirstName": "Torben",
                            "LastName": "L. Schou",
                            "Email": "abc@xyz.com",
                            "UpdateSinglebooking":0, //Optional
                            "UpdateGuestData": [
                                {
                                    "Salutation": "Mr.",
                                    "FirstName": "Torben",
                                    "LastName": "L. Schou",
                                    "Gender": "Male",
                                    "Type": "Adult",
                                    "DateOfBirth": "1985-05-05",
                                    "SpouseDateOfBirth": "1987-05-05",
                                    "WeddingAnniversary": "1987-10-05",
                                    "Address": "500 Kingston",
                                    "City": " Toronto",
                                    "State": "Ontario",
                                    "Country": "Canada",
                                    "Nationality": "India",
                                    "Zipcode": "123456",
                                    "Phone": "1234567890",
                                    "Mobile": "1234567890",
                                    "Fax": "1234567890",
                                    "Email": "abc@xyz.com",
                                    "RegistrationNo": "12345",
                                    "IdentityTypeID": "1234500000000000001",
                                    "IdentityNo": "123456789",
                                    "ExpiryDate": "2012-12-02"
                                }
                            ],
                            "Documents": [
                                {
                                    "Type": "1", 
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC"  
                               },
                               {
                                    "Type": "2",
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC"
                               },
                               {
                                    "Type": "3",
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC"
                               },
                               {
                                    "Type": "4",
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC"
                               }
                           ]
                        }
                    ]
                }
            ]
         }
    }

    2.For Multiple Booking Request
    {
            "RES_Request": {
            "Request_Type": "UploadDocument",
            "Authentication": {
                    "HotelCode": "xxxx",
                    "AuthCode": "xxxxxxxxxxxx"
            },
            "Reservation": [
                {
                    "BookingId": "123",  
                    "GuestDetails": [
                        {
                            "FirstName": "Torben",
                            "LastName": "L. Schou",
                            "Email": "abc@xyz.com",
                            "UpdateSinglebooking":1, //Optional
                            "UpdateGuestData": [
                                {
                                    "Salutation": "Mr.",
                                    "FirstName": "Torben",
                                    "LastName": "L. Schou",
                                    "Gender": "Male",
                                    "Type": "Adult",
                                    "DateOfBirth": "1994-03-25",
                                    "SpouseDateOfBirth": "1996-05-05",
                                    "WeddingAnniversary": "1997-10-18",
                                    "Address": "500 Kingston",
                                    "City": " Toronto",
                                    "State": "Ontario",
                                    "Country": "Canada",
                                    "Nationality": "India",
                                    "Zipcode": "123456",
                                    "Phone": "1234567890",
                                    "Mobile": "1234567890",
                                    "Fax": "1234567890",
                                    "Email": "abc@xyz.com",
                                    "RegistrationNo": "12345",
                                    "IdentityTypeID": "1234500000000000001",
                                    "IdentityNo": "123456789",
                                    "ExpiryDate": "2021-05-02"
                                }
                            ],
                            "Documents": [
                                {
                                    "Type": "1", 
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC"  
                                },
                                {
                                    "Type": "2", 
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC" 
                                }
                            ]
                        }
                    ]
               },
               {
                    "BookingId": "456",
                    "Guest Details": [
                        {
                            "FirstName": "Daryl",
                            "LastName": "S. Coleman",
                            "Email": "pqr@xyz.com",
                            "UpdateSinglebooking":0, //Optional
                            "UpdateGuestData": [
                                {
                                    "Salutation": "Mr.",
                                    "FirstName": "Daryl",
                                    "LastName": "S. Coleman",
                                    "Gender": "Male",
                                    "Type": "Adult",
                                    "DateOfBirth": "1998-10-21",
                                    "SpouseDateOfBirth": "2000-07-10",
                                    "WeddingAnniversary": "2001-01-20",
                                    "Address": "500 Kingston",
                                    "City": " Balimo",
                                    "State": "Papua",
                                    "Country": "Indonesia",
                                    "Nationality": "India",
                                    "Zipcode": "123456",
                                    "Phone": "1234567890",
                                    "Mobile": "1234567890",
                                    "Fax": "1234567890",
                                    "Email": "pqr@xyz.com",
                                    "RegistrationNo": "12345",
                                    "IdentityTypeID": "1234500000000000001",
                                    "IdentityNo": "123456789",
                                    "ExpiryDate": "2023-07-12"
                                }
                            ],
                            "Documents": [
                                {
                                    "Type": "1", 
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC" 
                                },
                                {
                                    "Type": "2",
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC" 
                                },
                                {
                                    "Type": "3",
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC"
                                },
                                {
                                    "Type": "4",
                                    "Images": "iVBORw0KGgoAAAANSUhEUgAAACIAAAAiCAIAAAC1JZyVAAAAA3NCSVQICAjb4U/gAAAAGXRFWHRTb2Z0d2FyZQBnbm9tZS1zY3JlZW5zaG907wO/PgAAAGtJREFUSIlj/P//PwPtARMd7Bi1ZtSaUWtGrRlm1rAwzr5FkgYFNmZjAbYcQyEHOW7idTEyzLpJosugYLeblIs8D5GKyQ+0aeffEa+YfGvOf/xND2se/PpLD2tIAqPWjFozas2oNaPWDFZrAAbVESQbyOtmAAAAAElFTkSuQmCC"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
     }

**Response**

|                      |               |                  |                   |
|----------------------|---------------|------------------|-------------------|
| **Name**             | **Data Type** | **Description ** | **Example**       |
| Success-\>SuccessMsg | String        | Success Message  | Successfully Done |
| Errors\>ErrorCode    | integer       | Error Code       | 100               |
| Errors\>ErrorMessage | String        | Error Message    | Success           |

**Success**

    1.Full Operation Is Successfully Completed
    {
        "Success": {
            "SuccessMsg": "Guest Data/Document successfully uploaded for Booking : 123"
        },
        "Error": {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
        }
    }

    2.Full Operation Is Successfully Completed For Multiple Booking
    {
        "Success": {
            "SuccessMsg": "Guest Data/Document successfully uploaded for Booking : 123,456"
        },
        "Error": {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
        }
    }

**Error**

``` json
 {    
      "Errors": {
        "ErrorCode": "301",
        "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
    }
}
```

**Error** **Codes**

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Error Code</strong></td>
<td><strong>Error Name</strong></td>
</tr>
<tr class="even">
<td>100</td>
<td>Missing required parameters</td>
</tr>
<tr class="odd">
<td>500</td>
<td>Error occurred during processing.</td>
</tr>
<tr class="even">
<td>502</td>
<td>Request Type is missing</td>
</tr>
<tr class="odd">
<td>101</td>
<td>Hotel Code is missing</td>
</tr>
<tr class="even">
<td>102</td>
<td>Authentication Code is missing</td>
</tr>
<tr class="odd">
<td>301</td>
<td>Unauthorized Request. Please check hotel code and authentication code</td>
</tr>
<tr class="even">
<td>302</td>
<td>Unauthorized Request. Integration is not allowed</td>
</tr>
<tr class="odd">
<td>303</td>
<td>Auth Code is inactive</td>
</tr>
<tr class="even">
<td>201</td>
<td>Unauthorized request.(Request Type) request is not valid for this hotel code</td>
</tr>
<tr class="odd">
<td>202</td>
<td>Unauthorized request. Hotel code is not active</td>
</tr>
<tr class="even">
<td>110</td>
<td>Booking ID is missing</td>
</tr>
<tr class="odd">
<td>111</td>
<td>Guest Identity Image String should be in base64_encoded format, So Document is not uploaded for BookingId : 123, Guest name : Torben L. Schou<br />
Guest Signature Image String should be in base64_encoded format, So Document is not uploaded for BookingId : 123, Guest name : Torben L. Schou<br />
Guest Image String should be in base64_encoded format, So Document is not uploaded for BookingId : 123, Guest name : Torben L. Schou<br />
Guest Voucher Image String should be in base64_encoded format, So Document is not uploaded for BookingId : 123, Guest name : Torben L. Schou</td>
</tr>
<tr class="even">
<td>112</td>
<td>Identity Information (Type, No) is compulsory to process your request</td>
</tr>
<tr class="odd">
<td>113</td>
<td>Either First Name/Last Name or Email is mandatory to process your request</td>
</tr>
<tr class="even">
<td>115</td>
<td>The Identity Type ID is not matching with Hotel Data for BookingId : 123, Guest name : Torben L. Schou</td>
</tr>
<tr class="odd">
<td>116</td>
<td>Invalid BookingId</td>
</tr>
<tr class="even">
<td>117</td>
<td>Guest Email : abc@xyz.com Not Exist For BookingId : 123, Guest name : Torben L. Schou<br />
Guest Name : Torben L. Schou is not exist For BookingId : 123</td>
</tr>
<tr class="odd">
<td>118</td>
<td>Guest Data is not updated For BookingId : 123</td>
</tr>
<tr class="even">
<td>119</td>
<td>Missing Parameter OR Invalid Parameter : UpdateGuestData For BookingId : 123<br />
Missing Parameter OR Invalid Parameter : GuestDetails For BookingId : 123</td>
</tr>
<tr class="odd">
<td>120</td>
<td>Invalid Date Format. Please enter YYYY-MM-DD For BookingId : 123, Guest name : Torben L. Schou</td>
</tr>
<tr class="even">
<td>121</td>
<td>Invalid Fields : Cities,States For BookingId : 123, Guest name : Torben L. Schou</td>
</tr>
<tr class="odd">
<td>122</td>
<td>Country Name is not matched with our given country name for BookingId : 123, Guest name : Torben L. Schou</td>
</tr>
<tr class="even">
<td>123</td>
<td>Nationality Name is not matched with our given country name for BookingId : 123, Guest name : Torben L. Schou</td>
</tr>
<tr class="odd">
<td>124</td>
<td>Maximum 5 booking data update for single request</td>
</tr>
<tr class="even">
<td>125</td>
<td>Please Contact to reception for update profile For BookingId : 123</td>
</tr>
<tr class="odd">
<td>126</td>
<td>Invalid Email address For BookingId : 123, Guest name : Torben L. Schou</td>
</tr>
<tr class="even">
<td>127</td>
<td>Given BookingId : 123 is checkout booking<br />
Given BookingId : 123 is void booking<br />
Given BookingId : 123 is cancelled booking<br />
Given BookingId : 123 is no show booking</td>
</tr>
<tr class="odd">
<td>128</td>
<td>Guest name : Torben L. Schou AND Customer Email : abc@xyz.com is repeat same profile multiple times For BookingId : 123</td>
</tr>
</tbody>
</table>

---

### BKG-24 · Add Payment

**Request\_Type:** `AddPayment`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2104

*Tags: Kiosk Connectivity, Open*

This API will post  the payment with cash/bank type paymethods to a particular single or multiple  reservation no. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Request_Type*</td>
<td>VARCHAR(100)</td>
<td>Request Type</td>
<td>AddPayment</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;BookingId*</td>
<td>VARCHAR(100)</td>
<td>Reservation No.</td>
<td>11-1  or 12</td>
</tr>
<tr class="even">
<td>Reservation-&gt;PaymentId*</td>
<td>INT(20)</td>
<td>Payment Unique id<br />
(Click here to get PaymentID)<br />
https://api.ezeetechnosys.com/#2048</td>
<td>123400000000000007</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;CurrencyId*</td>
<td>INT(20)</td>
<td>Currency Unique id<br />
(Click here to get CurrencyId)<br />
https://api.ezeetechnosys.com/#2048</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>Reservation-&gt;Payment*</td>
<td>DECIMAL(19,4)</td>
<td>Amount to pay</td>
<td>100.00</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;Comment</td>
<td>VARCHAR(100)</td>
<td>Comment is optional</td>
<td>Payment for room charges</td>
</tr>
<tr class="even">
<td>Receipt-&gt;FolioNo</td>
<td>INT(20)</td>
<td>FolioNo is optional</td>
<td>302</td>
</tr>
</tbody>
</table>

**Request **

``` json
{
     "RES_Request": {
             "Request_Type": "AddPayment",
             "Authentication": {
             "HotelCode": "1234",
             "AuthCode": "xxxxxxxxxxxxxxxx"
             },
             "Reservation": [{
                  "BookingId": "11-1",
                  "FolioNo": "",  //Optional
                  "PaymentId": "123400000000000007",
                  "CurrencyId": "123400000000000001",
                  "Payment": "70",
                  "Comment": "payment"
            },
            {
                 "BookingId": "12",
                 "FolioNo": "302",  //Optional
                 "PaymentId": "123400000000000007",
                 "CurrencyId": "123400000000000001",
                 "Payment": "200",
                 "Comment": "payment"
           }]
      }
}
```

#### **Parameter**

**Response**

|                     |               |                  |             |
|---------------------|---------------|------------------|-------------|
| **Name**            | **Data Type** | **Description ** | **Example** |
| Receipt-\>BookingId | varchar       | Reservation No.  | 12          |
| Receipt-\>ReceiptNo | Integer       | Receipt No.      | 230         |

**Success**

``` json
{
    "Success": {
        "SuccessMsg": "Payment done successfully for booking 11-1, 12",
        "Receipt": [
            {
                "BookingId": "11-1",
                "ReceiptNo": "1521,1524"
            },
            {
               "BookingId": "12",
               "ReceiptNo": "1522,1523"
            }
        ]
    },
    "Errors":[ {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
        } 
    ]   
}
```

****Success/Error:****

``` json
{
    "Success": {
        "SuccessMsg": "Payment done successfully for booking 12",
        "Receipt": [
            {
                "BookingId": "12",
                "ReceiptNo": "232"
            }
        ]
    },
    "Errors": [
        {
            "ErrorCode": "113",
            "ErrorMessage": "We don't find this reservation in our system. So payment not processed for booking 13"
        }
    ]
}
```

**Error**

``` json
{
    "Errors": [
        {
            "ErrorCode": "106",
            "ErrorMessage": "Payment amount is missing or invalid payment amount for booking 11-1"
        }
    ]
}
```

**Error** **Codes**

|                |                                                                                    |
|----------------|------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                     |
| 100            | Missing required parameters                                                        |
| 500            | Error occurred during processing.                                                  |
| 502            | Request Type is missing                                                            |
| 101            | Hotel Code is missing                                                              |
| 102            | Authentication Code is missing                                                     |
| 301            | Unauthorized Request. Please check hotel code and authentication code              |
| 302            | Unauthorized Request. Integration is not allowed                                   |
| 303            | Auth Code is inactive                                                              |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code       |
| 202            | Unauthorized request. Hotel code is not active                                     |
| 103            | Booking ID is missing                                                              |
| 104            | Payment Id  is missing for booking                                                 |
| 105            | Currency Id is missing for booking                                                 |
| 106            | Payment amount is missing or invalid payment amount for booking                    |
| 108            | Error in folio.                                                                    |
| 109            | Maximum 10 bookings are allowed at a time.                                         |
| 110            | Payment ID not valid                                                               |
| 114            | Currency is not valid for booking                                                  |
| 115            | Amount is exceeded than folio balance for booking                                  |
| 116            | Invalid parameter for booking                                                      |
| 113            | We don’t find this reservation in our system. So payment not processed for booking |
| 117            | Reservation is void. So payment not processed for booking                          |
| 118            | Reservation is past checked out. So payment not processed for booking              |
| 119            | Invalid folio no for booking                                                       |

---

### BKG-25 · Add Guest Profile to Bookings

**Request\_Type:** `AddSharer`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2151

*Tags: Kiosk Connectivity, Open*

This API helps you to Add Sharer data (name, phone, mobile, email, etc). The API can return data in JSON formats. The web service responds to HTTP POST requests.

**Note** : Maximum **Five** sharers  will only be processed **at a time**.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Request_Type*</td>
<td>VARCHAR(100)</td>
<td>Request Type</td>
<td>AddSharer</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;BookingId*</td>
<td>VARCHAR(255)</td>
<td>Unique Booking Id/Reservation No</td>
<td>456</td>
</tr>
<tr class="even">
<td>Sharers-&gt;Salutation</td>
<td>VARCHAR(100)</td>
<td>Salutation</td>
<td>Mr.</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;FirstName*</td>
<td>VARCHAR(500)</td>
<td>First Name</td>
<td>xxxxxx</td>
</tr>
<tr class="even">
<td>Sharers-&gt;LastName*</td>
<td>VARCHAR(500)</td>
<td>Last Name</td>
<td>xxxxxx</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;Gender*</td>
<td>VARCHAR(25)</td>
<td>Male/Female</td>
<td>Male/Female</td>
</tr>
<tr class="even">
<td>Sharers-&gt;Type*</td>
<td>VARCHAR(25)</td>
<td>For Update Type (Adult/Child)</td>
<td>Adult</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;DateOfBirth</td>
<td>DATE</td>
<td>Date Of Birthformat: YYYY-MM-DD</td>
<td>1985-05-05</td>
</tr>
<tr class="even">
<td>Sharers-&gt;SpouseDateOfBirth</td>
<td>DATE</td>
<td>Spouse date of birthformat: YYYY-MM-DD</td>
<td>1987-01-25</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;WeddingAnniversary</td>
<td>DATE</td>
<td>Wedding anniversary dateformat: YYYY-MM-DD</td>
<td>1987-10-05</td>
</tr>
<tr class="even">
<td>Sharers-&gt;Address</td>
<td>VARCHAR(1000)</td>
<td>Address</td>
<td>500 Kingston</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;City</td>
<td>VARCHAR(100)</td>
<td>Name of city</td>
<td>Toronto</td>
</tr>
<tr class="even">
<td>Sharers-&gt;State</td>
<td>VARCHAR(100)</td>
<td>State name</td>
<td>Ontario</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;Country</td>
<td>VARCHAR(100)</td>
<td>Country name</td>
<td>Canada<br />
(for country <br />
<a href="https://api.ezeetechnosys.com/#589">https://api.ezeetechnosys.com/#589</a></td>
</tr>
<tr class="even">
<td>Sharers-&gt;Nationality</td>
<td>VARCHAR(100)</td>
<td>Nationality</td>
<td>India<br />
(for country <br />
<a href="https://api.ezeetechnosys.com/#589">https://api.ezeetechnosys.com/#589</a>)</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;Zipcode</td>
<td>Integer(11)</td>
<td>zip code</td>
<td>123456</td>
</tr>
<tr class="even">
<td>Sharers-&gt;Phone</td>
<td>Integer(20)</td>
<td>Phone number</td>
<td>1234567890</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;Mobile</td>
<td>Integer(20)</td>
<td>Mobile number</td>
<td>1234567890</td>
</tr>
<tr class="even">
<td>Sharers-&gt;Fax</td>
<td>Integer(20)</td>
<td>Fax number</td>
<td>1234567890</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;Email*</td>
<td>VARCHAR(255)</td>
<td>Email id </td>
<td>abc@xyz.com</td>
</tr>
<tr class="even">
<td>Sharers-&gt;RegistratioNo</td>
<td>VARCHAR(255)</td>
<td>Registration number</td>
<td>12345</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;IdentityId</td>
<td>BIGINT(20)</td>
<td>Identity unique Id</td>
<td>1234500000000000001</td>
</tr>
<tr class="even">
<td>Sharers-&gt;IdentityNo</td>
<td>VARCHAR(255)</td>
<td>Identity type number</td>
<td>123456789</td>
</tr>
<tr class="odd">
<td>Sharers-&gt;ExpiryDate</td>
<td>DATE</td>
<td>Expiry dateformat: YYYY-MM-DD</td>
<td>2022-05-02</td>
</tr>
</tbody>
</table>

**Request **

    1.For Single Booking Request
    {
       "RES_Request": {
             "Request_Type": "AddSharer",
             "Authentication": {
                   "HotelCode": "xxxx",
                   "AuthCode": "xxxxxxxxxxxx"
               },
             "Sharers": [{
                    "BookingId": "RES101",  
                    "Salutation": "Ms.",
                    "FirstName": "Hexvi.S.", 
                    "LastName": "Shaby", 
                    "Gender": "Female", 
                    "Type": "Adult",         
                    "DateOfBirth": "",
                    "SpouseDateOfBirth": "",
                    "WeddingAnniversary": "",
                    "Address": "",
                    "City": " Brockway",
                    "State": "CA",
                    "Country": "Germany",
                    "Nationality": "Malta",
                    "Zipcode": "95730",
                    "Phone": "",
                    "Mobile": "3534",
                    "Fax": "564564",
                    "Email": "LarryLForney@rhyta.com", 
                    "RegistrationNo": "",
                    "IdentityTypeID": "894300000000000003",
                    "IdentityNo": "12345667765",
                    "ExpiryDate": ""
               }
               ]
           }
     }

    2.For Multiple Booking Request
    {
      "RES_Request": {
            "Request_Type": "AddSharer",
            "Authentication": {
                   "HotelCode": "xxxx",
                   "AuthCode": "xxxxxxxxxxxx"
             },
            "Sharers": [{
                   "BookingId": "RES102", 
                   "Salutation": "Ms.",
                   "FirstName": "Willi", 
                   "LastName": "Crooswoth", 
                   "Gender": "Female", 
                   "Type": "Adult",         
                   "DateOfBirth": "",
                   "SpouseDateOfBirth": "",
                   "WeddingAnniversary": "",
                   "Address": "",
                   "City": " Brockway",
                   "State": "CA",
                   "Country": "Germany",
                   "Nationality": "Malta",
                   "Zipcode": "95730",
                   "Phone": "",
                   "Mobile": "3534",
                   "Fax": "564564",
                   "Email": "LarryLForney@rhyta.com",  
                   "RegistrationNo": "",
                   "IdentityTypeID": "2700000000000001",
                   "IdentityNo": "12345667765",
                   "ExpiryDate": ""
              },
              {
                   "BookingId": "RES112",
                   "Salutation": "Ms.",
                   "FirstName": "Test",
                   "LastName": "One",
                   "Gender": "Female",
                   "Type": "Adult",
                   "DateOfBirth": "",
                   "SpouseDateOfBirth": "",
                   "WeddingAnniversary": "",
                   "Address": "",
                   "City": " Brockway",
                   "State": "CA",
                   "Country": "Germany",
                   "Nationality": "Malta",
                   "Zipcode": "95730",
                   "Phone": "",
                   "Mobile": "3534",
                   "Fax": "564564",
                   "Email": "LarryLForney@rhyta.com",
                   "RegistrationNo": "",
                   "IdentityTypeID": "2700000000000001",
                   "IdentityNo": "12345667765",
                   "ExpiryDate": ""

              }
               ]
          }
     }

                 
     

**Response**

|                       |               |                  |                   |
|-----------------------|---------------|------------------|-------------------|
| **Name**              | **Data Type** | **Description ** | **Example**       |
| Success-\>SuccessMsg  | String        | Success Message  | Successfully Done |
| Errors-\>ErrorCode    | integer       | Error Code       | 100               |
| Errors-\>ErrorMessage | String        | Error Message    | Success           |

**Success**

    1.Full operation is successfully completed
    {
        "Success": {
            "SuccessMsg": "Sharer is successfully added for Booking RES101"
        },
        "Errors": {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
        }
    }

    2.Full operation Is successfully completed for multiple booking
    {
            "Success": {
                  "SuccessMsg": "Sharer is successfully added for Booking RES101,RES112"
            },
            "Errors": {
                 "ErrorCode": "0",
                 "ErrorMessage": "Success"
            }
    }
    3.In case some booking are successfully added and some have errors for multiple bookings
    {
        "Success": {
            "SuccessMsg": "Sharer is successfully added for Booking RES101"
        },
        "Errors": [
            {
                "ErrorCode": "114",
                "ErrorMessage": 
                    "Country not properly added, it should be according to our database for Booking : RES112"
            }
        ]
    }

**Error**

``` json
{
    "Errors": {
        "ErrorCode": "615",
        "ErrorMessage": "Unauthorized Request: This request is not valid."
    }
}
```

**Error** **Codes**

|                |                                                                                                                                          |
|----------------|------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                                           |
| 100            | Missing required parameters                                                                                                              |
| 500            | Error occurred during processing.                                                                                                        |
| 502            | Invalid Request Type                                                                                                                     |
| 101            | Hotel Code is missing                                                                                                                    |
| 102            | Authentication Code is missing                                                                                                           |
| 303            | Auth Code is inactive                                                                                                                    |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                                             |
| 202            | Unauthorized request. Hotel code is not active                                                                                           |
| 615            | Unauthorized Request: This request is not valid.                                                                                         |
| 600            | Something went wrong. please try again. Booking                                                                                          |
| 110            | BookingId is missing                                                                                                                     |
| 111            | You cannot add more sharers as the maximum limit for adults reached for the type of room offered, so adding Sharer failed for Booking    |
| 112            | You cannot add more sharers as the maximum limit for children reached for the type of room offered, so adding Sharer failed for Booking  |
| 121            | Either firstname/lastName or Email is mandatory to process your request for Booking                                                      |
| 114            | Country/Nationality is not properly added, it should be according to our database for Booking                                            |
| 115            | Invalid field \<field\> for Booking                                                                                                      |
| 116            | Invalid value “\<value\>” for field “\<field name\>” for Booking                                                                         |
| 113            | We don’t find this reservation in our system. So you can’t add guest for Booking                                                         |
| 117            | Reservation is canceled,noshow or void. So you can’t add guest for Booking                                                               |
| 118            | Reservation is past checked out. So you can’t add guest for Booking                                                                      |
| 120            | Maximum five sharers will be processed at a time                                                                                         |
| 122            | Mandatory field(s) IdentityTypeID/IdentityNo are missing for Reservation                                                                 |

---

### BKG-26 · Guest Check In

**Request\_Type:** `GuestCheckIn`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2172

*Tags: Kiosk Connectivity, Open*

This API helps you to check in to your reservation. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**Note**: Maximum **Five** bookings will be processed **at a time**.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity> 

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Request_Type*</td>
<td>VARCHAR(100)</td>
<td>Request Type</td>
<td>GuestCheckIn</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;<br />
BookingId*</td>
<td>VARCHAR(150)</td>
<td>Unique Booking Id/Reservation No</td>
<td>456 or RES-456</td>
</tr>
<tr class="even">
<td>Reservation-&gt;<br />
GuestName *</td>
<td>VARCHAR(250)</td>
<td>Guest Name (same as booking Guest Name)</td>
<td>Yasir P Wayde</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;<br />
Email *</td>
<td>VARCHAR(250)</td>
<td>Guest Email (same as booking Guest Email)</td>
<td>xxxxxx@example.com</td>
</tr>
<tr class="even">
<td>Reservation-&gt;<br />
Address *</td>
<td>VARCHAR(250)</td>
<td>Guest Address</td>
<td>Street – 5, Sector-10, Main road, Mumbai</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;<br />
Phone *</td>
<td>VARCHAR(25)</td>
<td>Guest Phone number</td>
<td>91XXXXXXXXXX</td>
</tr>
<tr class="even">
<td>Reservation-&gt;<br />
Mobile *</td>
<td>VARCHAR(25)</td>
<td>Guest Mobile number</td>
<td>91XXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;<br />
IdentityTypeID</td>
<td>BIGINT(20)</td>
<td>Identity Unique Id</td>
<td>1234500000000000001<br />
(To get this ID, please check API [Retrieve Identity Type])<br />
<a href="https://api.ezeetechnosys.com/#2059">https://api.ezeetechnosys.com/#2059</a></td>
</tr>
<tr class="even">
<td>Reservation-&gt;<br />
IdentityNo</td>
<td>VARCHAR(25)</td>
<td>Identity type number</td>
<td>123456789</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;<br />
IdentityImage</td>
<td>TEXT</td>
<td>Identity image (Encoded Image String)</td>
<td>iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA3NCSVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==</td>
</tr>
<tr class="even">
<td>Reservation-&gt;<br />
GuestImage</td>
<td>TEXT</td>
<td>Guest image (Encoded Image String)</td>
<td>iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA3NCSVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;<br />
GuestSignature</td>
<td>TEXT</td>
<td>Guest Signature image (Encoded Image String)</td>
<td>iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA3NCSVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==</td>
</tr>
<tr class="even">
<td>Reservation-&gt;<br />
TaxationId</td>
<td>VARCHAR(155)</td>
<td>Registration number</td>
<td>123456789</td>
</tr>
</tbody>
</table>

**Request **

1.For Single Booking Request

``` json
{
"RES_Request": {
      "Request_Type": "GuestCheckIn",
      "Authentication": {
          "HotelCode": "xxxx",
          "AuthCode": "xxxxxxxxxxxxxxxxxxxxxxx"
       },
      "Reservation": [
      {
          "BookingId": "331",
          "GuestName": "XXXXXXXXX",
          "Email": "xxxxxx@example.com",
          "Address": "XXXXX road",
          "Phone": "xxxxxxxxx",
          "Mobile": "xxxxxxxxx",
          "IdentityTypeID": "1234500000000000001",
          "IdentityNo": "xxxxxx",
          "IdentityImage": "iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA 3NCSVQICAjb4U/gAAAAEHRF WHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQA AAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
          "GuestImage": "iVBORw0KGgoAAAANSUhEUgAAABMAAA AWCAIAAACt/zAoAAAAA3NCSVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
          "GuestSignature": "iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA3NC SVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
          "TaxationId": "xxxxx"
      }
      ]
    }
}
```

2.For Multiple Booking Request

``` json
{
"RES_Request": {
      "Request_Type": "GuestCheckIn",
      "Authentication": {
          "HotelCode": "xxxx",
          "AuthCode": "xxxxxxxxxxxxxxxxxxxxxxx"
       },
      "Reservation": [
      {
          "BookingId": "333-1",
          "GuestName": "XXXXXXXXX",
          "Email": "xxxxxx@example.com",
          "Address": "XXXXX road",
          "Phone": "xxxxxxxxx",
          "Mobile": "xxxxxxxxx",
          "IdentityTypeID": "1234500000000000001",
          "IdentityNo": "xxxxxx",
          "IdentityImage": "iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA 3NCSVQICAjb4U/gAAAAEHRF WHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQA AAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
          "GuestImage": "iVBORw0KGgoAAAANSUhEUgAAABMAAA AWCAIAAACt/zAoAAAAA3NCSVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
          "GuestSignature": "iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA3NC SVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
          "TaxationId": "xxxxx"
      },
      {
           "BookingId": "333-2",
           "GuestName": "XXXXXXXXX",
           "Email": "xxxxxx@example.com",
           "Address": "XXXXXXXXX road",
           "Phone": "xxxxxxxxx",
           "Mobile": "xxxxxxxxx",
           "IdentityTypeID": "1234500000000000001",
           "IdentityNo": "xxxxxx",
           "IdentityImage": "iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA 3NCSVQICAjb4U/gAAAAEHRF WHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQA AAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
           "GuestImage": "iVBORw0KGgoAAAANSUhEUgAAABMAAA AWCAIAAACt/zAoAAAAA3NCSVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
           "GuestSignature": "iVBORw0KGgoAAAANSUhEUgAAABMAAAAWCAIAAACt/zAoAAAAA3NC SVQICAjb4U/gAAAAEHRFWHRTb2Z0d2FyZQBTaHV0dGVyY4LQCQAAAFRJREFUOMtj/Pr1KwNZgImBXDBSdLLglz5268P0PY+fvf/1+ccfYnX+/fd/xt4nCw89I9m15x98xqMNn85Fh5+RGUK3nn8lU+e7r39G09CoTtrqBAB1MiHSwHyEmgAAAABJRU5ErkJggg==",
           "TaxationId": "xxxxx"
      }
      ]
    }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Success-&gt;<br />
SuccessMsg</td>
<td>String</td>
<td>Success Message</td>
<td>Successfully Done</td>
</tr>
<tr class="odd">
<td>Success-&gt;<br />
GuestRegistrationCards-&gt;<br />
BookingId</td>
<td>String</td>
<td>Booking Id</td>
<td>331</td>
</tr>
<tr class="even">
<td>Success-&gt;<br />
GuestRegistrationCards-&gt;<br />
GRCardNo</td>
<td>String</td>
<td>GR Card Number</td>
<td>34</td>
</tr>
<tr class="odd">
<td>Errors-&gt;ErrorCode</td>
<td>integer</td>
<td>Error Code</td>
<td>0</td>
</tr>
<tr class="even">
<td>Errors-&gt;ErrorMessage</td>
<td>String</td>
<td>Error Message</td>
<td>Success</td>
</tr>
</tbody>
</table>

**Success**

    1.Full operation is successfully completed
    {
        "Success": {
            "SuccessMsg": "Guest Check In successfully for Booking 331",
            "GuestRegistrationCards": [
             {
                   "BookingId": "331",
                   "GRCardNo": "34"
             }
             ]
        },
        "Errors": [
         {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
         }
        ]
    }

    2.Full operation is successfully completed for multiple booking
    {
        "Success": {
            "SuccessMsg": "Guest Check In successfully for Booking 333-1,333-2",
            "GuestRegistrationCards": [
             {
                   "BookingId": "333-1",
                   "GRCardNo": "34"
             },
             {
                   "BookingId": "333-2",
                   "GRCardNo": "35"
             }
             ]
        },
        "Errors": [
         {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
        }
        ]
    }

    3.In case some bookings are successfully checked in and some have errors for multiple bookings
    {
           "Success": {
                  "SuccessMsg": "Guest Check In successfully for Booking 331-2,332",
                  "GuestRegistrationCards": [
                  {
                         "BookingId": "331-2",
                         "GRCardNo": "34"
                  },
                  {
                         "BookingId": "332",
                         "GRCardNo": "35"
                  }
                 ]
          },
          "Error": [
           {
                "ErrorCode": 128,
                "ErrorMessage": "Guest has already checked in. So guest check in not performed for Booking 331-1"
           }
           ]
    }

**Error**

``` json
{ 
      "Error": [
       {
            "ErrorCode": 100,
            "ErrorMessage": "Missing required parameters."
       }
       ]
}
```

**Error** **Codes**

|                |                                                                                                                                                      |
|----------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                                                       |
| 100            | Missing required parameters.                                                                                                                         |
| 500            | Error occurred during processing                                                                                                                     |
| 501            | Error occurred during CheckIn processing                                                                                                             |
| 502            | Request Type is missing                                                                                                                              |
| 600            | Something went wrong!                                                                                                                                |
| 101            | Hotel Code is missing                                                                                                                                |
| 102            | Authentication Code is missing                                                                                                                       |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                                                                |
| 302            | Unauthorized Request. Integration is not allowed                                                                                                     |
| 303            | Auth Code is inactive.                                                                                                                               |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                                                         |
| 202            | Unauthorized request. Hotel code is not active                                                                                                       |
| 110            | Booking ID is missing in Reservation block                                                                                                           |
| 111            | Identity Image string should be in base64_encoded format, So Identity Image not uploaded for booking                                                 |
| 112            | Booking Details : GuestName, Address, Email, Phone, Mobile is mandatory to process your checkin request. So guest check in not performed for booking |
| 113            | We don’t find this reservation in our system. So guest check in not performed for booking.                                                           |
| 114            | Guest Image string should be in base64_encoded format, So Guest Image not uploaded for booking                                                       |
| 115            | Guest Signature string should be in base64_encoded format, So Guest Signature not uploaded for booking                                               |
| 116            | Room is not assigned, so guest check in not performed for booking                                                                                    |
| 117            | Room is dirty, so guest check in not performed for booking                                                                                           |
| 118            | Invalid Fields                                                                                                                                       |
| 119            | Invalid Email address For Booking                                                                                                                    |
| 120            | \<Fields\> – Compulsory Fields in order to process for check in                                                                                      |
| 121            | Guest Data is not updated For Booking                                                                                                                |
| 122            | The IdentityTypeID is not matching with Hotel Data for Booking                                                                                       |
| 123            | Guest Identity Image is not uploaded For Booking                                                                                                     |
| 124            | Guest Image is not uploaded For Booking                                                                                                              |
| 125            | Guest Signature is not uploaded For Booking                                                                                                          |
| 126            | Today is not a check in date. So guest check in not performed for Booking                                                                            |
| 127            | Booking Status is not confirmed. So guest check in not performed for Booking                                                                         |
| 128            | Guest has already checked in. So guest check in not performed for Booking                                                                            |
| 129            | You are not allowed to check in for more than five bookings.                                                                                         |
| 130            | Booking status is check out. So guest check in not performed for Booking                                                                             |
| 133            | Room is occupied or not checked-out                                                                                                                  |

---

### BKG-27 · Room Assignment

**Request\_Type:** `AssignRoom`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2197

*Tags: Kiosk Connectivity, Open*

This API helps you to Assign Room to your reservation. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**Note**: Maximum **Five bookings** will be processed at a time.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json  

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Request_Type*</td>
<td>VARCHAR(100)</td>
<td>Request Type</td>
<td>AssignRoom</td>
</tr>
<tr class="odd">
<td>RoomAssign-&gt;BookingId*</td>
<td>VARCHAR(100)</td>
<td>Reservation No.</td>
<td>RES101,RES112-1</td>
</tr>
<tr class="even">
<td>RoomAssign-&gt;RoomTypeID*</td>
<td>BIGINT(20)</td>
<td>Unique RoomType ID</td>
<td>1234500000000000001<br />
Please check API <strong>Retrieve Room Information</strong> to get RoomTypeID<br />
<a href="https://api.ezeetechnosys.com/?#519">https://api.ezeetechnosys.com/?#519</a></td>
</tr>
<tr class="odd">
<td>RoomAssign-&gt;RoomID*</td>
<td>BIGINT(20)</td>
<td>Unique Room ID</td>
<td>1234500000000000001<br />
Please check API <strong>Retrieve Room Information</strong> to get RoomID<br />
<a href="https://api.ezeetechnosys.com/?#519">https://api.ezeetechnosys.com/?#519</a></td>
</tr>
</tbody>
</table>

**Request **

``` json
{
     "RES_Request": {
             "Request_Type": "AssignRoom",
             "Authentication": {
             "HotelCode": "xxxx",
             "AuthCode": "xxxxxxxxxxxx"
             },
             "RoomAssign": [{
                  "BookingId": "RES101",
                  "RoomTypeID": "1234500000000000001",
                  "RoomID": "1234500000000000001"
            },
            {
                 "BookingId": "RES112-1",
                 "RoomTypeID": "1234500000000000002",
                 "RoomID": "1234500000000000002"
           }]
      }
}
```

**Response**

|                       |               |                 |                   |
|-----------------------|---------------|-----------------|-------------------|
| **Name**              | **Data Type** | **Description** | **Example**       |
| Success-\>SuccessMsg  | String        | Success Message | Successfully Done |
| Errors-\>ErrorCode    | Integer       | Error Code      | 100               |
| Errors-\>ErrorMessage | String        | Error Message   | Success           |

**Success**

``` json
{       
   "Success": {
        "SuccessMsg": "Room Assignment is successfully done for Booking RES101,RES112-1. "
    },
    "Errors": {
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }
}
```

******Only 1 Room Assigned Success******

``` json
{       
    "Success": {
        "SuccessMsg": "Room Assignment is successfully done for Booking RES101"
    },
    "Errors": {
        "ErrorCode": "111",
        "ErrorMessage": "Room ID does not belongs to Room Type ID for Booking RES112-1 "
    }
}
```

**Error**

``` json
 {         
    "Errors": {
        "ErrorCode": "301",
        "ErrorMessage": "Unauthorized Request. Please check hotel code and authentication code"
     }
}
```

**Error** **Codes**

|                |                                                                                                 |
|----------------|-------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                  |
| 100            | Missing required parameters                                                                     |
| 500            | Error occurred during processing.                                                               |
| 502            | Request Type is missing                                                                         |
| 101            | Hotel Code is missing                                                                           |
| 102            | Authentication Code is missing                                                                  |
| 301            | Unauthorized Request. Please check hotel code and authentication code                           |
| 302            | Unauthorized Request. Integration is not allowed                                                |
| 303            | Auth Code is inactive                                                                           |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                    |
| 202            | Unauthorized request. Hotel code is not active                                                  |
| 108            | Booking ID is missing                                                                           |
| 110            | Room ID is missing for Booking                                                                  |
| 111            | Room ID does not belongs to Room Type ID for Booking                                            |
| 112            | You are not allowed to room assign for more than five                                           |
| 113            | Booking Id does not exist OR Booking status is void/ cancel/ noshow                             |
| 114            | Room Type ID is missing for Booking                                                             |
| 115            | Room Type ID does not exist for Booking                                                         |
| 116            | Room Type ID is not matching with Booking                                                       |
| 118            | Invalid Parameter for Booking                                                                   |
| 127            | Booking Status is not confirmed. so, there is not possible to assign room to Booking            |
| 129            | Room has already assigned to Booking                                                            |
| 130            | Booking status is checked out. so, there is not possible to assign room to Booking              |
| 131            | Room has been already assigned to other booking. So, room assignment is not possible on Booking |

---

### BKG-28 · Guest Check Out

**Request\_Type:** `GuestCheckOut`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2252

*Tags: Kiosk Connectivity, Open*

This API helps you to check out your reservation. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**Note**: Maximum **Five** checkout will be allowed **at a time**.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity> 

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Request_Type*</td>
<td>VARCHAR(100)</td>
<td>Request Type</td>
<td>GuestCheckOut</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;<br />
BookingId*</td>
<td>VARCHAR(150)</td>
<td>Unique Booking Id/Reservation No</td>
<td>456 or RES-456</td>
</tr>
</tbody>
</table>

**Request **

1.For Single Booking Request

``` json
{
         "RES_Request": {
                "Request_Type": "GuestCheckOut",
                "Authentication": {
                       "HotelCode": "xxxxx",
                       "AuthCode": "xxxxxxxxxxxxxxxxxxxxxxx"
                },
                "Reservation": [
                {
                       "BookingId": "575"
                }
                ]
         }
}
```

2.For Multiple Booking Request

``` json
{
         "RES_Request": {
                "Request_Type": "GuestCheckOut",
                "Authentication": {
                       "HotelCode": "xxxxx",
                       "AuthCode": "xxxxxxxxxxxxxxxxxxxxxxx"
                },
                "Reservation": [
                {
                       "BookingId": "575"
                },
                {
                       "BookingId": "576"
                },
                ]
         }
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Success-&gt;<br />
SuccessMsg</td>
<td>String</td>
<td>Success Message</td>
<td>Successfully Done</td>
</tr>
<tr class="odd">
<td>Success-&gt;<br />
Invoices-&gt;<br />
BookingId</td>
<td>String</td>
<td>Booking Id</td>
<td>575</td>
</tr>
<tr class="even">
<td>Success-&gt;<br />
Invoices-&gt;<br />
InvoiceNo</td>
<td>String</td>
<td>Invoice Number</td>
<td>65</td>
</tr>
<tr class="odd">
<td>Errors-&gt;ErrorCode</td>
<td>integer</td>
<td>Error Code</td>
<td>0</td>
</tr>
<tr class="even">
<td>Errors-&gt;ErrorMessage</td>
<td>String</td>
<td>Error Message</td>
<td>Success</td>
</tr>
</tbody>
</table>

**Success**

    1.Full operation is successfully completed
    {
        "Success": {
            "SuccessMsg": "Guest Check Out is successfully done for Booking 575",
            "Invoices": [
             {
                   "BookingId": "575",
                   "InvoiceNo": "65"
             }
             ]
        },
        "Errors": [
         {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
         }
        ]
    }

    2.Full operation is successfully completed for multiple booking
    {
        "Success": {
            "SuccessMsg": "Guest Check Out is successfully done for Booking 575,576",
            "Invoices": [
             {
                   "BookingId": "575",
                   "InvoiceNo": "65"
             },
             {
                   "BookingId": "576",
                   "InvoiceNo": "66"
             }
             ]
        },
        "Errors": [
         {
            "ErrorCode": "0",
            "ErrorMessage": "Success"
        }
        ]
    }

    3.In case some bookings are successfully checked out and some have errors for multiple bookings
    {
           "Success": {
                  "SuccessMsg": "Guest Check Out is successfully done for Booking 575,576",
                  "Invoices": [
                  {
                         "BookingId": "575",
                         "InvoiceNo": "65"
                  },
                  {
                         "BookingId": "576",
                         "InvoiceNo": "66"
                  }
                 ]
          },
          "Error": [
           {
                "ErrorCode": 118,
                "ErrorMessage": "Booking status has been checked out for Booking 524"
           }
           ]
    }

**Error**

``` json
{ 
      "Error": [
       {
            "ErrorCode": 100,
            "ErrorMessage": "Missing required parameters."
       }
       ]
}
```

**Error** **Codes**

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Error Code</strong></td>
<td><strong>Error Name</strong></td>
</tr>
<tr class="even">
<td>100</td>
<td>Missing required parameters.</td>
</tr>
<tr class="odd">
<td>500</td>
<td>Error occurred during processing</td>
</tr>
<tr class="even">
<td>501</td>
<td>Error occurred during CheckIn processing</td>
</tr>
<tr class="odd">
<td>502</td>
<td>Request Type is missing</td>
</tr>
<tr class="even">
<td>600</td>
<td>Something went wrong!</td>
</tr>
<tr class="odd">
<td>101</td>
<td>Hotel Code is missing</td>
</tr>
<tr class="even">
<td>102</td>
<td>Authentication Code is missing</td>
</tr>
<tr class="odd">
<td>301</td>
<td>Unauthorized Request. Please check hotel code and authentication code</td>
</tr>
<tr class="even">
<td>302</td>
<td>Unauthorized Request. Integration is not allowed</td>
</tr>
<tr class="odd">
<td>303</td>
<td>Auth Code is inactive.</td>
</tr>
<tr class="even">
<td>201</td>
<td>Unauthorized request.(Request Type) request is not valid for this hotel code</td>
</tr>
<tr class="odd">
<td>202</td>
<td>Unauthorized request. Hotel code is not active</td>
</tr>
<tr class="even">
<td>110</td>
<td>Booking ID is missing in Reservation block</td>
</tr>
<tr class="odd">
<td>113</td>
<td>We don’t find this reservation in our system. So guest check out not performed for booking.</td>
</tr>
<tr class="even">
<td>114</td>
<td>Folio pending on reservation. So guest check out is not performed for Booking</td>
</tr>
<tr class="odd">
<td>115</td>
<td>Reservation is not yet checked in. So guest check out is not performed for Booking</td>
</tr>
<tr class="even">
<td>116</td>
<td>Today is not a check out date. So guest check out is not performed for Booking</td>
</tr>
<tr class="odd">
<td>117</td>
<td>Booking status has been cancelled, noshow or void.<br />
So guest check out is not performed for Booking</td>
</tr>
<tr class="even">
<td>118</td>
<td>Booking status has been checked out for Booking</td>
</tr>
<tr class="odd">
<td>119</td>
<td>Late checkout charge is posted on Folio. So folio is pending on reservation and guest check out is not performed for Booking</td>
</tr>
<tr class="even">
<td>129</td>
<td>You are not allowed to check out for more than five bookings</td>
</tr>
</tbody>
</table>

---

### BKG-29 · Retrieve List of Bills

**Request\_Type:** `RetrieveListofBills`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2274

*Tags: Kiosk Connectivity, Open*

This API will fetch the folio related billing information for particular reservation no. like folio no, due amount, total amount, total paid amount, guest name, billing person name The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

**Parameter **

|                |               |                            |                     |
|----------------|---------------|----------------------------|---------------------|
| **Name**       | **Data Type** | **Description**            | **Example**         |
| HotelCode\*    | INT(11)       | Unique Hotel code          | xxxx                |
| AuthCode\*     | VARCHAR(300)  | Unique Authentication code | xxxxxxxxxx          |
| Request_Type\* | VARCHAR(100)  | Request Type               | RetrieveListofBills |
| BookingId\*    | VARCHAR(100)  | Reservation No.            | 11-1  or 12         |

**Request **

``` json
{
     "RES_Request": {
             "Request_Type": "RetrieveListofBills",
             "Authentication": {
             "HotelCode": "xxxx",
             "AuthCode": "xxxxxxxxxxxxxxxx",
             "BookingId": "7" 
             }
      }
}
```

**Response**

|                           |               |                                      |              |
|---------------------------|---------------|--------------------------------------|--------------|
| **Name**                  | **Data Type** | **Description **                     | **Example**  |
| FolioList-\>foliono       | Integer       | Folio no                             | 302          |
| FolioList-\>BillToContact | varchar       | Name of billing person               | Baiju        |
| FolioList-\>GuestName     | varchar       | Name of guest who booked reservation | Winsent Lobo |
| FolioList-\>CurrencyCode  | varchar       | Currency Code                        | INR          |
| FolioList-\>TotalCharges  | float         | Total charges of folio               | 500.00       |
| FolioList-\>PaidAmo       | float         | Total paid amount of folio           | 200.00       |
| FolioList-\>DueAmount     | float         | Total due amount of folio            | 300.00       |

**Success**

``` json
{
    "Success": {
       "FolioList": [
            {
                "foliono": "297",
                "BillToContact": "max",
                "GuestName": "max",
                "CurrencyCode": "INR",
                "TotalCharges": "500.00",
                "PaidAmount": "-200.00",
                "DueAmount": "300.00"
            },
            {
                "foliono": "298",
                "BillToContact": "max",
                "GuestName": "max",
                "CurrencyCode": "INR",
                "TotalCharges": "600.00",
                "PaidAmount": "-200.00",
                "DueAmount": "400.00"
            }            
        ]
    },
    "Errors":{
        "ErrorCode": "0",
        "ErrorMessage": "Success"
    }  
}
```

**Error**

``` json
{
   "Errors": {
        "ErrorCode": "203",
        "ErrorMessage": "Reservation is not found for booking 25"
    }
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameter – BookingId                                       |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 103            | Booking ID is missing                                                        |
| 104            | Invalid parameter for bookingId                                              |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 203            | Reservation is not found for booking                                         |
| 204            | Reservation is cancelled, noshow or void for booking                         |

---

### BKG-30 · Retrieve Transaction Details

**Request\_Type:** `GetTransactionDetails`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2370

*Tags: Open, PMS Connectivity*

This API helps you to fetch booking details for specific transaction unique ID based on Room No, Guest, Identity No, Guest Email, Guest Mobile No, Guest Registration No. The API can return data in JSON formats. The web service responds to HTTP POST requests.  

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                     |               |                                                  |                       |
|---------------------|---------------|--------------------------------------------------|-----------------------|
| **Name**            | **Data Type** | **Description**                                  | **Example**           |
| Request_Type\*      | VARCHAR(100)  | Request Type                                     | GetTransactionDetails |
| TranunkId\*         | VARCHAR(100)  | Transaction Id single/multiple (comma separated) | xxxxx0000000000400    |
| RoomNo              | VARCHAR(500)  | Room No (It is Optional)                         | 101                   |
| Guest               | VARCHAR(100)  | Guest Name (It is Optional)                      | test                  |
| IdentityNo          | VARCHAR(255)  | Identity No (It is Optional)                     | ASD43543              |
| GuestEmail          | VARCHAR(255)  | Guest Email (It is Optional)                     | abc@gmail.com         |
| GuestMobileNo       | VARCHAR(255)  | Guest Mobile No (It is Optional)                 | XXXXXXXXXX            |
| GuestRegistrationNo | VARCHAR(255)  | Guest Registration No (It is Optional)           | XXXXXX                |
| HotelCode\*         | INT(11)       | Unique Hotel code                                | xxxx                  |
| AuthCode\*          | VARCHAR(300)  | Unique Authentication code                       | xxxxxxxxxx            |

**Request **

``` json
{           
      "RES_Request": {
            "Request_Type": "GetTransactionDetails,"
.           "TranunkId": "xxxxx0000000000400",
            "RoomNo": "101",
            "Guest": "Joy T. Mnewy",          
            "IdentityNo": "ASD43543",              
            "GuestEmail": "XXXXXX@gmail.com",              
            "GuestMobileNo": "XXXXXXXXXX",  
            "GuestRegistrationNo": "XXXXXX", 
            "Authentication": {
                 "HotelCode": "XXXX",
                 "AuthCode": "XXXXXXXXXXXXXXXXXXX"
           } 
      }
}
 
```

**Response**

|                                                                                                                             |               |                                                                                                                                                                                                                                                                                          |                                         |
|-----------------------------------------------------------------------------------------------------------------------------|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| **Name**                                                                                                                    | **Data Type** | **Description**                                                                                                                                                                                                                                                                          | **Example**                             |
| LocationId                                                                                                                  | INT(11)       | Hotel code                                                                                                                                                                                                                                                                               | xxxx                                    |
| UniqueID                                                                                                                    | VARCHAR(255)  | Unique Booking id/ Reservation No                                                                                                                                                                                                                                                        | 10125, 86436, B4525 etc                 |
| BookedBy                                                                                                                    | VARCHAR(255)  | Information regarding Booked by                                                                                                                                                                                                                                                          | Booking.com etc                         |
| Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo. | VARCHAR(255)  | Here \* denotes guest information like Salutation, FirstName, LastName, Gender, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo.                                                                                                                       | shown in JSON response below.           |
| Source                                                                                                                      | VARCHAR(1000) | Booking generated source                                                                                                                                                                                                                                                                 | Booking.com etc                         |
| PaymentMethod                                                                                                               | VARCHAR(255)  | Payment Mode selected by guest                                                                                                                                                                                                                                                           | Cash, Credit, CityLedger etc            |
| IsChannelBooking                                                                                                            | INT(1)        | Is booking comes from channel \[0 or 1\]1 : Booking from the channel.0: Booking not from the channel.                                                                                                                                                                                    | 0 or 1                                  |
| BookingTran. SubBookingId                                                                                                   | VARCHAR(255)  | Sub booking Id                                                                                                                                                                                                                                                                           | 138                                     |
| BookingTran. TransactionId                                                                                                  | INT(20)       | Booking Transaction ID                                                                                                                                                                                                                                                                   | 112500000000000163                      |
| BookingTran. Status                                                                                                         | VARCHAR(100)  | Booking Status                                                                                                                                                                                                                                                                           | New or Modify or Cancel.                |
| BookingTran.IsConfirmed                                                                                                     | INT(1)        | Booking Confirmation Flag. \[1 or 0\]1 : Confirmed0 : Not Confirmed                                                                                                                                                                                                                      | 1 or 0.                                 |
| BookingTran.CurrentStatus                                                                                                   | VARCHAR(100)  | Booking Current Status                                                                                                                                                                                                                                                                   | Arrived, Checked Out, Cancel, Void, etc |
| BookingTran.VoucherNo                                                                                                       | VARCHAR(255)  | Booking Voucher No                                                                                                                                                                                                                                                                       | 10203049/8512                           |
| BookingTran. PackageCode                                                                                                    | INT(20)       | Package Code                                                                                                                                                                                                                                                                             | 112500000000000001                      |
| BookingTran. PackageName                                                                                                    | VARCHAR(1000) | Package Name                                                                                                                                                                                                                                                                             | European Plan etc                       |
| BookingTran. RateplanCode                                                                                                   | INT(20)       | Unique RatePlan Code                                                                                                                                                                                                                                                                     | 112500000000000006                      |
| BookingTran. RateplanName                                                                                                   | STRING(1000)  | RatePlan Name                                                                                                                                                                                                                                                                            | Grand Sea View Junior Suite             |
| BookingTran. RoomTypeCode                                                                                                   | INT(20)       | Unique RoomType Code                                                                                                                                                                                                                                                                     | 112500000000000006                      |
| BookingTran. RoomTypeName                                                                                                   | STRING(1000)  | RoomType Name                                                                                                                                                                                                                                                                            | Garden View Studio Room                 |
| BookingTran.RoomID                                                                                                          | INT(20)       | Unique RoomID                                                                                                                                                                                                                                                                            | 112500000000000001                      |
| BookingTran. RoomName                                                                                                       | STRING(1000)  | Room Name                                                                                                                                                                                                                                                                                | 101                                     |
| BookingTran. Start                                                                                                          | DATE          | Check-in date\[Format : yyyy-mm-dd\]                                                                                                                                                                                                                                                     | 2017-12-25                              |
| BookingTran. End                                                                                                            | DATE          | Check-out date \[Format : yyyy-mm-dd\]                                                                                                                                                                                                                                                   | 2017-12-27                              |
| BookingTran.TotalRate                                                                                                       | DECIMAL(19,4) | Rate on room in amount                                                                                                                                                                                                                                                                   | 1500.43                                 |
| BookingTran.TotalDiscount                                                                                                   | DECIMAL(19,4) | Discount on room in amount                                                                                                                                                                                                                                                               | 500                                     |
| BookingTran. TotalExtraCharge                                                                                               | DECIMAL(19,4) | Extra charges in amount(if any)                                                                                                                                                                                                                                                          | 300                                     |
| BookingTran.\*                                                                                                              | –             | Here \* denotes guest informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityType, IdentityNo, ExpiryDate.                |                                         |
| BookingTran. TransportationMode                                                                                             | VARCHAR(100)  | Mode of transportation                                                                                                                                                                                                                                                                   | Bus, car etc                            |
| BookingTran. Vehicle                                                                                                        | VARCHAR(255)  | Detail of vehicle                                                                                                                                                                                                                                                                        |                                         |
| BookingTran. PickupDate                                                                                                     | DATE          | Pickup date\[Format : yyyy-mm-dd\]                                                                                                                                                                                                                                                       | 2017-12-25 etc                          |
| BookingTran. PickupTime                                                                                                     | TIME          | Pickup time                                                                                                                                                                                                                                                                              |                                         |
| BookingTran. Source                                                                                                         | VARCHAR(1000) | Booking generated source                                                                                                                                                                                                                                                                 | [Booking.com](http://booking.com/)      |
| BookingTran. Comment                                                                                                        | VARCHAR(1000) | Additional Information or comment.                                                                                                                                                                                                                                                       |                                         |
| BookingTran. AffiliateName                                                                                                  | VARCHAR(1000) | Booking Affiliate Name                                                                                                                                                                                                                                                                   |                                         |
| BookingTran.AffiliateCode                                                                                                   | VARCHAR(1000) | Booking Affiliate Code                                                                                                                                                                                                                                                                   |                                         |
| BookingTran.\*                                                                                                              | –             | Here \* denotes Credit Card Informations like CCLink, CCNo, CCType, CardHolderName, CCExpiryDate,                                                                                                                                                                                        | CCLink in encoded with base64_encode.   |
| BookingTran.RentalInfo.RoomID                                                                                               | INT(20)       | Unique RoomID                                                                                                                                                                                                                                                                            | 112500000000000001                      |
| BookingTran.RentalInfo. RoomName                                                                                            | STRING(1000)  | Room Name                                                                                                                                                                                                                                                                                | 101                                     |
| BookingTran.RentalInfo.EffectiveDate                                                                                        | DATETIME      | Booking details for particular effective date                                                                                                                                                                                                                                            | 2017-12-25 etc                          |
| BookingTran.RentalInfo.PackageCode                                                                                          | INT(20)       | Package code                                                                                                                                                                                                                                                                             | 112500000000000001                      |
| BookingTran.RentalInfo.PackageName                                                                                          | VARCHAR(1000) | Package Name                                                                                                                                                                                                                                                                             | European Plan                           |
| BookingTran.RentalInfo.RoomTypeCode                                                                                         | INT(20)       | Unique RoomType Code                                                                                                                                                                                                                                                                     | 112500000000000006                      |
| BookingTran.RentalInfo.RoomTypeName                                                                                         | STRING(1000)  | RoomType Name                                                                                                                                                                                                                                                                            | Grand Sea View Junior Suite             |
| BookingTran.RentalInfo.Adult                                                                                                | INT(11)       | No. of Adults                                                                                                                                                                                                                                                                            | 2,3,4 etc                               |
| BookingTran. RentalInfo.Child                                                                                               | INT(11)       | No. of Child                                                                                                                                                                                                                                                                             | 2,3,4 etc                               |
| BookingTran. RentalInfo.Rent                                                                                                | DECIMAL(19,4) | Room rental amount                                                                                                                                                                                                                                                                       | 1500.43                                 |
| BookingTran. RentalInfo.Discount                                                                                            | DECIMAL(19,4) | Discount on rental room in amount                                                                                                                                                                                                                                                        | 500                                     |
| BookingTran.Sharer.\*                                                                                                       | –             | Here \* denotes Sharer informations like Salutation, FirstName, LastName, Gender, DateOfBirth, SpouseDateOfBirth, WeddingAnniversary, Nationality, Address, City, State, Country, Nationality,Zip Code, Phone, Mobile, Fax, Email,RegistrationNo,IdentityTypeID, IdentityNo, ExpiryDate. |                                         |
| Errors.ErrorCode                                                                                                            | –             | Response Error Code                                                                                                                                                                                                                                                                      | 104, 404 etc                            |
| Errors.ErrorMessage                                                                                                         | –             | Generate Response Message                                                                                                                                                                                                                                                                | Unauthorized Request. etc               |

**Success**

``` json
{
  "Reservations": {
    "Reservation": [
      {
        "BookingTran": [
          {
            "SubBookingId": "11241254",
            "TransactionId": "112400000000001902",
            "Createdatetime": "2019-09-04 11:40:30",
            "Modifydatetime": "2019-09-04 11:40:30",
            "Status": "New",
            "IsConfirmed": "1",
            "CurrentStatus": "Arrived",
            "VoucherNo": "single1276/1",
            "PackageCode": "112400000000000001",
            "PackageName": "European Plan",
            "RateplanCode": "112400000000000001",
            "RateplanName": "Sea View Deluxe Room",
            "RoomTypeCode": "112400000000000001",
            "RoomTypeName": "Sea View Deluxe Room",
            "RoomID": "112400000000000001",           
            "RoomName": "101",
            "Start": "2019-09-26",
            "End": "2019-09-28",
            "ArrivalTime": "12:00:00",
            "DepartureTime": "11:00:00",
            "CurrencyCode": "USD",
            "TotalAmountAfterTax": "976.00",
            "TotalAmountBeforeTax": "800.00",
            "TotalTax": "176.00",
            "TotalDiscount": "0.00",
            "TotalExtraCharge": "0.00",
            "TotalPayment": "0.00",
            "TACommision": "0.00",
            "Salutation": "Ms.",
            "FirstName": "Test",
            "LastName": "One",
            "Gender": "Female",
            "DateOfBirth": "",
            "SpouseDateOfBirth": "",
            "WeddingAnniversary": "",
            "Address": "",
            "City": " Brockway",
            "State": "CA",
            "Country": "USA",
            "Nationality": "Malta",
            "Zipcode": "95730",
            "Phone": "",
            "Mobile": "3534",
            "Fax": "564564",
            "Email": "LarryLForney@rhyta.com",
            “RegistrationNo” : "", 
            "IdentityType": "Pan card",
            "IdentityNo": "12345667765",
            "ExpiryDate": "",
            "TransportationMode": "",
            "Vehicle": "car",
            "PickupDate": "",
            "PickupTime": "",
            "Source": "BookingEye",
            "Comment": "",
            "AffiliateName": "",
            "AffiliateCode": "",
            "CCLink": "",
            "CCNo": "",
            "CCType": "",
            "CCExpiryDate": "",
            "CardHoldersName": "",
            "TaxDeatil": [
              {
                "TaxCode": "AA",
                "TaxName": "VAT @ 12%",
                "TaxAmount": "96.0000"
              },
              {
                "TaxCode": "LT",
                "TaxName": "Luxury @ 10%",
                "TaxAmount": "80.0000"
              }
            ],
            "RentalInfo": [
              {
                "RoomID": "112400000000000001",   
                "RoomName": "101",
                "EffectiveDate": "2019-09-26",
                "PackageCode": "112400000000000001",
                "PackageName": "European Plan",
                "RoomTypeCode": "112400000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Adult": "4",
                "Child": "2",
                "RentPreTax": "550.00",
                "Rent": "671.00",
                "Discount": "0.00"
              },
              {
                 "RoomID": "112400000000000001",   
                 "RoomName": "101",
                "EffectiveDate": "2019-09-27",
                "PackageCode": "112400000000000001",
                "PackageName": "European Plan",
                "RoomTypeCode": "112400000000000001",
                "RoomTypeName": "Sea View Deluxe Room",
                "Adult": "4",
                "Child": "2",
                "RentPreTax": "250.00",
                "Rent": "305.00",
                "Discount": "0.00"
              }
            ],
        "Sharer": [               
               {
                "Salutation": "Ms.",
                "FirstName": "Test",
                "LastName": "One",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": " Brockway",
                "State": "CA",
                "Country": "USA",
                "Nationality": "Malta",
                "Zipcode": "95730",
                "Phone": "",
                "Mobile": "3534",
                "Fax": "564564",
                "Email": "LarryLForney@rhyta.com",
                "RegistrationNo" : "",  
                "IdentityTypeID": "894300000000000003",
                "IdentityNo": "12345667765",
                "ExpiryDate": "",
              },
              {
                "Salutation": "Ms.",
                "FirstName": "Test",
                "LastName": "One",
                "Gender": "Female",
                "DateOfBirth": "",
                "SpouseDateOfBirth": "",
                "WeddingAnniversary": "",
                "Address": "",
                "City": " Brockway",
                "State": "CA",
                "Country": "USA",
                "Nationality": "Malta",
                "Zipcode": "95730",
                "Phone": "",
                "Mobile": "3534",
                "Fax": "564564",
                "Email": "LarryLForney@rhyta.com",
                "Registration No" : "",  
                "IdentityTypeID": "894300000000000003",
                "IdentityNo": "12345667765",
                "ExpiryDate": "",
              }
            ] 
          }
        ],
        "LocationId": "1124",
        "UniqueID": "11241254",
        "BookedBy": "BookingEye",
        "Salutation": "Ms.",
        "FirstName": "Larry",
        "LastName": "Forney",
        "Gender": "Female",
        "Address": "",
        "City": "Brockway",
        "State": "CA",
        "Country": "USA",
        "Zipcode": "95730",
        "Phone": "",
        "Mobile": "3534",
        "Fax": "564564",
        "Email": "LarryLForney@rhyta.com",
        "Source": "BookingEye",
        "PaymentMethod": "Cash",
        "IsChannelBooking": "1"
      }
    ]
  }
}
```

**Error** **Codes**

|                |                                                                                                                   |
|----------------|-------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                    |
| 100            | Missing required parameters.                                                                                      |
| 101            | Hotel Code is missing                                                                                             |
| 102            | Authentication Code is missing                                                                                    |
| 201            | Unauthorized request. (Request Type) the request is not valid for this hotel code OR OpenAPI platform is deactive |
| 202            | Unauthorized request. Hotel code is not active                                                                    |
| 203            | Missing Parameter OR Invalid Parameter: TranunkId                                                                 |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                             |
| 303            | Auth Code is inactive.                                                                                            |
| 500            | Error occurred during processing                                                                                  |
| 502            | Request Type is missing                                                                                           |
| 503            | No Reservation Found.                                                                                             |

---

### BKG-31 · Create a Booking

**Request\_Type:** `InsertBooking`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode=xxxxx&APIKey=XXXXXXXXXXXXXXXX&BookingData={`  ·  **eZee ref:** #2412

*Tags: eZee Reservation Required, Meta Search*

This API helps you to insert new bookings in our system. The API can return data in JSON formats. The web service responds to HTTP GET requests.

You need to take **eZee Reservation** to use this API.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?request_type=[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&BookingData=[BOOKING_DATA]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “InsertBooking”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[BookingData] *</td>
<td>Json</td>
<td>You need to pass JSON data. please follow below “BookingData” section</td>
<td></td>
</tr>
<tr class="odd">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en.<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
<tr class="even">
<td>publishtoweb</td>
<td>TINYINT(1)</td>
<td>1 – will retrieve all Room Types0 – will retrieve room types which are published to WEBDefault value is 0</td>
<td>0 OR 1</td>
</tr>
</tbody>
</table>

**BookingData** **JSON Format **

``` json
{
  "Room_Details": {
    "Room_1": {
      "Rateplan_Id": "[RATEPLAN_ID]", /* Mandatory */
      "Ratetype_Id": "[RATETYPE_ID]", /* Mandatory */
      "Roomtype_Id": "[ROOMTYPE_ID]", /* Mandatory */
      "baserate": "[BASERATE]", /* Mandatory */
      "extradultrate": "[EXTRADULTRATE]", /* Mandatory */
      "extrachildrate": "[EXTRACHILDRATE]", /* Mandatory */
      "number_adults": "[NUMBER_ADULTS]", /* Mandatory */
      "number_children": "[NUMBER_CHILDREN]", /* Mandatory */
      "ExtraChild_Age": "[EXTRACHILD_AGE]", /* Mandatory if number_children is not zero*/
      "Package_Details": { /* If package is booked then only pass below details and for package otherwise ignore :*/
        "Package_Id": "[PACKAGE_ID]", /* Mandatory */
        "Package_Name": "[PACKAGE_NAME]", /* Mandatory */
        "Package_Description": "PACKAGE_DESCRIPTION"
      },
      "Promotion_Details": { /* If room is booked using promotional code then only pass below details and for promotion otherwise ignore: */
        "Promotional_Code": "[PROMOTIONAL_CODE]", /* Mandatory */
        "Promotion_Id": "[PROMOTION_ID]", /* Mandatory */
        "Promotion_Name": "[PROMOTION_NAME]", /* Mandatory */
        "Promotion_Description": "[PROMOTION_DESCRIPTION]"
      },
      "Title": "[TITLE]",
      "First_Name": "[FIRST_NAME]", /* Mandatory */
      "Last_Name": "[LAST_NAME]", /* Mandatory */
      "Gender": "[GENDER]",
      "SpecialRequest": "[SPECIALREQUEST]"
    },
    "Room_2": {}
  },
  "ExtraCharge": { /* This will be useful when various Extra Charges exist in system and booker take any extra charge in booking. */
    "Extra_1": {
      "ExtraChargeId": "[EXTRACHARGEID]", /* Mandatory */
      "ChargeAdult": "[CHARGEADULT]" /* Mandatory */
    },
    "Extra_2": {
      "ExtraChargeId": "[EXTRACHARGEID]",
      "ChargeChild": "[CHARGECHILD]"
    },
  },
  "CardDetails": { /* All below parameters related to CardDetails are mandatory for inserting card details in transaction. If any of the below listed parameter is missing card details won’t be added in transaction. */
    "cc_cardnumber": "[CC_CARDNUMBER]",
    "cc_cardtype": "[CC_CARDTYPE]",
    "cc_expiremonth": "[CC_EXPIREMONTH]",
    "cc_expireyear": "[CC_EXPIERYEAR]",
    "cvvcode": "[CVVCODE]",
    "cardholdername": "[CARDHOLDERNAME]"
  },
  "check_in_date": "[CHECK_IN_DATE]", /* Mandatory */
  "check_out_date": "[CHECK_OUT_DATE]", /* Mandatory */
  "Booking_Payment_Mode": "[BOOKING_PAYMENT_MODE]",
  "Email_Address": "[EMAIL_ADDRESS]", /* Mandatory */
  "Source_Id": "[SOURCE_ID]",
  "MobileNo": "[MOBILENO]",
  "Address": "[ADDRESS]",
  "State": "STATE",
  "Country": "[COUNTRY]",
  "City": "[CITY]",
  "Zipcode": "[ZIPCODE]",
  "Fax": "[FAX]",
  "Device": "[DEVICE]",
  "Languagekey": "[LANGUAGEKEY]",
  "paymenttypeunkid": "[PAYMENTGATEWAY_ID]"
}
```

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=InsertBooking&HotelCode=xxxxx&APIKey=XXXXXXXXXXXXXXXX&BookingData={"Room_Details":{"Room_1":{"Rateplan_Id":"1872700000000000002","Ratetype_Id":"1872700000000000001","Roomtype_Id":"1872700000000000002","baserate":"3500","extradultrate":"500","extrachildrate":"500","number_adults":"2","number_children":"1","ExtraChild_Age":"2","Title":"","First_Name":"ABC","Last_Name":"Joy","Gender":"","SpecialRequest":""}},"check_in_date":"2021-02-22","check_out_date":"2021-02-23","Booking_Payment_Mode":"","Email_Address":"abc@gmail.com","Source_Id":"","MobileNo":"","Address":"","State":"","Country":"","City":"","Zipcode":"","Fax":"","Device":"","Languagekey":"","paymenttypeunkid":""}

**Response**

|                  |               |                                                                                                                         |             |
|------------------|---------------|-------------------------------------------------------------------------------------------------------------------------|-------------|
| **Name**         | **Data Type** | **Description**                                                                                                         | **Example** |
| ReservationNo    | String        | Unique Reservatrion number                                                                                              | 266         |
| SubReservationNo | String        | Sub Reservation number is same as Res No for Single booking but If Group booking, It will show you sub number (1,2,3,…) | 266         |
| InventoryMode    | String        | Mode of Inventory                                                                                                       | ALLOCATED   |

**Success**

``` json
{"ReservationNo":"266","SubReservationNo":["266"],"Inventory_Mode":"ALLOCATED","lang_key":"en"}
```

**Error Codes**

|                   |                                                                                                                                                  |
|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**    | **Error Name**                                                                                                                                   |
| HotelCodeEmpty    | Hotel code is empty.                                                                                                                             |
| NORESACC          | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ         | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| -1                | No Data found.                                                                                                                                   |
| APIACCESSDENIED   | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing | Missing parameters.                                                                                                                              |
| InvalidData       | Please check data passed.                                                                                                                        |

---

### BKG-32 · Add Extra Charge

**Request\_Type:** `AddExtraCharge`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.kioskconnectivity`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2794

*Tags: Kiosk Connectivity, Open*

This API will post the extra charge to a particular single or multiple reservations. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.kioskconnectivity>

**Header**

Content-Type: application/json

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Request_Type*</td>
<td>VARCHAR(100)</td>
<td>Request Type</td>
<td>AddExtraCharge</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;BookingId*</td>
<td>VARCHAR(100)</td>
<td>Reservation No.</td>
<td>11-1  or 12</td>
</tr>
<tr class="even">
<td>Reservation-&gt;FolioNo</td>
<td>INT(20)</td>
<td>Folio No.</td>
<td>12</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;ChargeId*</td>
<td>INT(20)</td>
<td>Charge Unique Id<br />
(Click here to get ChargeId)<br />
https://api.ezeetechnosys.com/#592<br />
</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>Reservation-&gt;Amount*</td>
<td>DECIMAL(19,4)</td>
<td>Amount to pay</td>
<td>100.00</td>
</tr>
<tr class="odd">
<td>Reservation-&gt;Qty*</td>
<td>INT(20)</td>
<td>Quantity</td>
<td>1 or 2</td>
</tr>
<tr class="even">
<td>Receipt-&gt;Comment</td>
<td>VARCHAR(100)</td>
<td>Comment is optional</td>
<td>Extra charge is added for room</td>
</tr>
</tbody>
</table>

  
**Note:** To get the chargeunkid of specific extra charge, use this api  
**API :** [Retrieve Extras](https://api.ezeetechnosys.com/?s=Retrieve+Extras)

  
**Request **

``` json
{
  "RES_Request": {
    "Request_Type": "AddExtraCharge",
    "Authentication": {
      "HotelCode": "1234",
      "AuthCode": "xxxxxxxxxxxxxxxx"
    },
    "Reservation": [
      {
        "BookingId": "11-1",
        "FolioNo": "",  // Optional
        "ChargeId": "123400000000000007",
        "Amount": "70",
        "Qty": "1",
        "Comment": "extra charge is added"
      },
      {
        "BookingId": "12",
        "FolioNo": "302",  // Optional
        "ChargeId": "123400000000000007",
        "Amount": "10",
        "Qty": "5",
        "Comment": "extra charge is added"
      }
    ]
  }
}
```

#### **Response**

**Success**

``` json
{
  "Success": {
    "SuccessMsg": "Extra charge is added successfully for booking 11-1"
  },
  "Errors": [
    {
      "ErrorCode": "0",
      "ErrorMessage": "Success"
    }
  ]
}
```

****Success/Error:****

``` json
{
  "Success": {
    "SuccessMsg": "Extra charge is added successfully for booking 11-1"
  },
  "Errors": [
    {
      "ErrorCode": "104",
      "ErrorMessage": "Charge Id is missing for booking 12"
    }
  ]
}
```

**Error**

``` json
{
  "Errors": [
    {
      "ErrorCode": "104",
      "ErrorMessage": "Charge Id is missing for booking 12"
    }
  ]
}
```

**Error** **Codes**

|                |                                                                                    |
|----------------|------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                     |
| 100            | Missing required parameters                                                        |
| 500            | Error occurred during processing.                                                  |
| 502            | Request Type is missing                                                            |
| 101            | Hotel Code is missing                                                              |
| 102            | Authentication Code is missing                                                     |
| 301            | Unauthorized Request. Please check hotel code and authentication code              |
| 302            | Unauthorized Request. Integration is not allowed                                   |
| 303            | Auth Code is inactive                                                              |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code       |
| 202            | Unauthorized request. Hotel code is not active                                     |
| 103            | Booking ID is missing                                                              |
| 104            | Payment Id  is missing for booking                                                 |
| 105            | Currency Id is missing for booking                                                 |
| 106            | Payment amount is missing or invalid payment amount for booking                    |
| 108            | Error in folio.                                                                    |
| 109            | Maximum 10 bookings are allowed at a time.                                         |
| 110            | Payment ID not valid                                                               |
| 114            | Currency is not valid for booking                                                  |
| 115            | Amount is exceeded than folio balance for booking                                  |
| 116            | Invalid parameter for booking                                                      |
| 113            | We don’t find this reservation in our system. So payment not processed for booking |
| 117            | Reservation is void. So payment not processed for booking                          |
| 118            | Reservation is past checked out. So payment not processed for booking              |
| 119            | Invalid folio no for booking                                                       |

---



<!-- ====================================================================== -->


# Housekeeping

> eZee / YCS Connectivity API — `HK` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

Use the housekeeping API for cleaning and maintenance purposes.

**4 endpoints in this file:** HK-01 Retrieve Inhouse Room Status, HK-02 Update Room Status, HK-03 Set out of Order (Block Room), HK-04 Unblock room

---

### HK-01 · Retrieve Inhouse Room Status

**Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.hkinfoforkaterina`  ·  **Content-Type:** application/json  ·  **eZee ref:** #786

*Tags: Open*

This API provides housekeeping information of todays vacant and occupied rooms and also provides check in guest information.  API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.hkinfoforkaterina](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

| Name         | Data Type    | Description                | Example           |
|--------------|--------------|----------------------------|-------------------|
| HotelCode \* | INT(11)      | Unique Hotel code          | XXXX              |
| AuthCode \*  | VARCHAR(300) | Unique Authentication code | XXXXXXXXXXXXXXXXX |

**Request **

``` json
{
     "authcode": "xxxxxxxxxxxx",
      "hotel_code":"xxxx"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>roomlist.hotelcode</td>
<td>Integer</td>
<td>Hotel unique code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>roomlist.roomid</td>
<td>Integer</td>
<td>ID of Room</td>
<td>123450000000000001</td>
</tr>
<tr class="even">
<td>roomlist.unitid</td>
<td>Integer</td>
<td>Unit ID</td>
<td>123450000000000001</td>
</tr>
<tr class="odd">
<td>roomlist.roomname</td>
<td>String</td>
<td>Name Of Room</td>
<td>101</td>
</tr>
<tr class="even">
<td>roomlist.roomtypeid</td>
<td>Integer</td>
<td>RoomType ID</td>
<td>123450000000000004</td>
</tr>
<tr class="odd">
<td>roomlist.roomtypename</td>
<td>String</td>
<td>Name of RoomType</td>
<td>Delux</td>
</tr>
<tr class="even">
<td>roomlist.isblocked</td>
<td>String</td>
<td>Is Blocked</td>
<td>No</td>
</tr>
<tr class="odd">
<td>roomlist.hkstatus</td>
<td>String</td>
<td>Housekeeping Status</td>
<td>Clean</td>
</tr>
<tr class="even">
<td>roomlist.hkremarks</td>
<td>String</td>
<td>Housekeeping Remarks</td>
<td>cleaned</td>
</tr>
<tr class="odd">
<td>roomlist.roomstatus</td>
<td>String</td>
<td>Status of Room</td>
<td>Available</td>
</tr>
<tr class="even">
<td>checkinguestlist.hotel_code</td>
<td>Integer</td>
<td>Hotel unique code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>checkinguestlist.reservationno</td>
<td>Integer</td>
<td>Reservation Number</td>
<td>10</td>
</tr>
<tr class="even">
<td>checkinguestlist.guestname</td>
<td>String</td>
<td>Name of Guest</td>
<td>John Lenth</td>
</tr>
<tr class="odd">
<td>checkinguestlist.email</td>
<td>String</td>
<td>Email of Guest</td>
<td>johnl123@example.com</td>
</tr>
<tr class="even">
<td>checkinguestlist.address</td>
<td>String</td>
<td>Address of Guest</td>
<td>123, abc building, USA</td>
</tr>
<tr class="odd">
<td>checkinguestlist.room</td>
<td>String</td>
<td>Room Name</td>
<td>101</td>
</tr>
<tr class="even">
<td>checkinguestlist.roomtype</td>
<td>String</td>
<td>Room Type</td>
<td>Delux</td>
</tr>
<tr class="odd">
<td>checkinguestlist.ratetype</td>
<td>String</td>
<td>Rate type</td>
<td>Frequent Traveler</td>
</tr>
<tr class="even">
<td>checkinguestlist.bookingdate</td>
<td>Datetime</td>
<td>Date of Booking</td>
<td>2020-04-11 16:44:47</td>
</tr>
<tr class="odd">
<td>checkinguestlist.checkindate</td>
<td>Datetime</td>
<td>Date of CheckIn</td>
<td>2020-04-17 15:44:47</td>
</tr>
<tr class="even">
<td>checkinguestlist.checkoutdate</td>
<td>Datetime</td>
<td>Date of CheckOut</td>
<td>2020-04-20 19:44:47</td>
</tr>
<tr class="odd">
<td>checkinguestlist.businesssource</td>
<td>Integer</td>
<td>Business source unique id</td>
<td>123450000000000001</td>
</tr>
<tr class="even">
<td>checkinguestlist.market</td>
<td>Integer</td>
<td>Market unique id</td>
<td>123450000000000001</td>
</tr>
<tr class="odd">
<td>checkinguestlist.travelagent</td>
<td>Integer</td>
<td>Travel Agent id</td>
<td>123450000000000001</td>
</tr>
<tr class="even">
<td>checkinguestlist.company</td>
<td>String</td>
<td>Name of Company</td>
<td>Ping Man</td>
</tr>
<tr class="odd">
<td>checkinguestlist.tavoucherno</td>
<td>Integer</td>
<td>Travel agent Voucher number</td>
<td>1</td>
</tr>
<tr class="even">
<td>checkinguestlist.Adult</td>
<td>Integer</td>
<td>Number of adult</td>
<td>2</td>
</tr>
<tr class="odd">
<td>checkinguestlist.Child</td>
<td>Integer</td>
<td>Number of child</td>
<td>1</td>
</tr>
<tr class="even">
<td>checkinguestlist.housekeepingremarks Stayover</td>
<td>String</td>
<td>Housekeeping remarks</td>
<td>Cleaned</td>
</tr>
<tr class="odd">
<td>checkinguestlist.bookingstatus</td>
<td>String</td>
<td>Status of booking<br />
such as<br />
Arrival,Check Out,<br />
Due Out,Confirmed Reservation,<br />
Void,Cancel,No Show,<br />
Maintenance Block,Unconfirmed Reservation,Stayover,<br />
Unblock,Dayuse Reservation,Dayuse</td>
<td>Stayover</td>
</tr>
</tbody>
</table>

**Success**

``` json
{
    "roomlist": [
        {
            "hotel_code": "xxxx",
            "roomid": "123450000000000001",
            "unitid": "123450000000000001",
            "roomname": "101",
            "roomtypeid": "123450000000000004",
            "roomtypename": "Delux",
            "isblocked": "No",
            "hkstatus": "Dirty",
            "hkremarks": "",
            "roomstatus": "Available"
        },
        {
            "hotel_code": "xxxx",
            "roomid": "123450000000000002",
            "unitid": "123450000000000002",
            "roomname": "102",
            "roomtypeid": "123450000000000004",
            "roomtypename": "Delux",
            "isblocked": "No",
            "hkstatus": "",
            "hkremarks": "",
            "roomstatus": "Available"
        }
        ],
    "checkinguestlist": [
        {
            "hotel_code": "xxxx",
            "reservationno": "8",
            "guestname": "Mr. John Lenth",
            "email": "johnl123@example.com",
            "address": "123, abc building, USA",
            "room": "103",
            "roomtype": "Twin",
            "ratetype": "Frequent Traveller",
            "bookingdate": "2020-04-11 16:44:47",
            "checkindate": "2020-03-17 13:37:16",
            "checkoutdate": "2020-03-20 17:42:00",
            "businesssource": "",
            "market": "",
            "travelagent": "",
            "company": "",
            "tavoucherno": "",
            "Adult": "2",
            "Child": "1",
            "housekeepingremarks": "",
            "bookingstatus": "Stayover"
        }
    ]
}
```

**Error** **Codes**

    Property Deactivated: This property has been deactivated
    OpenAPI Record invalid: Unauthorized Request. Please check hotel code and authentication code
    OpenAPI Deactivated: Auth Code is inactive.
    OpenAPI Request: Property is not authorized to access this api.

---

### HK-02 · Update Room Status

**Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.hkupdatestatus`  ·  **Content-Type:** application/json  ·  **eZee ref:** #792

*Tags: Open*

This API helps to update housekeeping information on an inhouse room.  This API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.hkupdatestatus>

**Header**

Content-Type: application/json

#### **Parameter**

| Name         | Data Type    | Description                | Example            |
|--------------|--------------|----------------------------|--------------------|
| HotelCode \* | INT(11)      | Unique Hotel code          | XXXX               |
| AuthCode \*  | VARCHAR(300) | Unique Authentication code | XXXXXXXXXXXXXXXXX  |
| roomid \*    | BIGINT(20)   | ID of Room                 | 123450000000000001 |
| unitid \*    | BIGINT(20)   | Unit ID                    | 123450000000000001 |
| hkstatus \*  | VARCHAR(300) | Housekeeping Status        | Clean              |
| hkremarks    | VARCHAR(300) | Housekeeping Remarks       | Cleaned            |

**Request **

``` json
 {
"authcode":"xxxxxxxxxxxx",
"hotel_code":"xxxx",
 "updatehkdata": [{
      "hotel_code": "xxxx",
       "roomid": "123450000000000001", 
       "unitid": "1213450000000000001", 
       "hkstatus": "Clean",
       "hkremarks": ""
      },{
       "hotel_code": "xxxx",
       "roomid": "123450000000000002", 
       "unitid": "123450000000000003", 
       "hkstatus": "Dirty",
       "hkremarks": ""
 }]
}
```

**Response**

|          |               |                  |                                                            |
|----------|---------------|------------------|------------------------------------------------------------|
| **Name** | **Data Type** | **Description ** | **Example**                                                |
| status   | String        | Update status    | 1                                                          |
| message  | String        | Message          | Success                                                    |
| warning  | Integer       | Warning          | This request will not be process as hotel_code is invalid. |

**Success**

``` json
{
    "status": "0",
    "message": "Success"
}
```

**Error** **Codes**

    Property Deactivated: {"errorcode":"1","message":"This property has been deactivated."}
    OpenAPI Record invalid: {"errorcode":"1","message":" Unauthorized Request. Please check hotel code and authentication code "}
    OpenAPI Deactivated: {"errorcode":"1","message":" Auth Code is inactive. "}
    OpenAPI Request: {"errorcode":"1","message":"Property is not authorized to access this api. "}

---

### HK-03 · Set out of Order (Block Room)

**Request\_Type:** `SetoutofOrder`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #797

*Tags: Open*

This API helps to block a room due to maintenance purposes thereby making a room unavailable for sale. This API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/pmsinterface/pms_connectivity.php](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr class="header">
<th>Name</th>
<th>Data Type</th>
<th>Description</th>
<th>Example</th>
</tr>
</thead>
<tbody>
<tr class="odd">
<td>HotelCode *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="even">
<td>AuthCode *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>RoomID *</td>
<td>INT(20)</td>
<td>ID of Room</td>
<td>123450000000000001</td>
</tr>
<tr class="even">
<td>RoomtypeID *</td>
<td>INT(20)</td>
<td>ID of RoomType</td>
<td>123450000000000001</td>
</tr>
<tr class="odd">
<td>FromDate *</td>
<td>Date</td>
<td>From date. [Format: yyyy-mm-dd]</td>
<td>2020-07-12</td>
</tr>
<tr class="even">
<td>ToDate *</td>
<td>Date</td>
<td>To date. [Format: yyyy-mm-dd]</td>
<td>2020-07-13</td>
</tr>
<tr class="odd">
<td>Reason</td>
<td>VARCHAR(300)</td>
<td>Reason for out of order.</td>
<td>Block Room,<br />
Maintenance, etc</td>
</tr>
</tbody>
</table>

**Request **

``` json
{
"RES_Request": {
"Request_Type": "SetoutofOrder",
"Authentication": {
"HotelCode": "xxxx",
"AuthCode": "xxxxxxxxxxxx"
},
"Rooms": [
{
"RoomID": "123450000000000004",
"RoomtypeID":"123450000000000006",
"FromDate": "2020-05-15",
"ToDate": "2020-05-16",
"Reason": "Block Room"
}
]}
}
```

**Response**

|                     |               |                                   |                                                                       |
|---------------------|---------------|-----------------------------------|-----------------------------------------------------------------------|
| **Name**            | **Data Type** | **Description **                  | **Example**                                                           |
| Success.SuccessMsg  | –             | Generate Success Response Message | Rooms Blocked Successfully                                            |
| Errors.ErrorCode    | –             | Response Error Code               | 0, 301 etc                                                            |
| Errors.ErrorMessage | –             | Generate Response Message         | Unauthorized Request. Please check hotel code and authentication code |

**Success**

``` json
{
"Errors": {
"ErrorCode": "0",
"ErrorMessage": "Success"
},
"Success": {
"SuccessMsg": "Rooms Blocked Successfully"
}
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters                                                                                        |
| 500            | Error occurred during processing.                                                                                  |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 103            | Room ID is missing                                                                                                 |
| 104            | Roomtype ID is missing                                                                                             |
| 105            | From Date is missing.                                                                                              |
| 106            | From Date is not a valid date                                                                                      |
| 107            | To Date is missing                                                                                                 |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive                                                                                              |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 115            | Reason is missing                                                                                                  |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 110            | From Date is not a valid date, FromDate should be greater than HotelDate                                           |
| 128            | Room/s cannot be blocked for selected dates                                                                        |

---

### HK-04 · Unblock room

**Request\_Type:** `UnblockRoom`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2012

*Tags: Open*

This API helps to unblock a room thereby making a room available for sale. This API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/pmsinterface/pms_connectivity.php](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

| Name          | Data Type    | Description                       | Example            |
|---------------|--------------|-----------------------------------|--------------------|
| HotelCode \*  | INT(11)      | Unique Hotel code                 | XXXX               |
| AuthCode \*   | VARCHAR(300) | Unique Authentication code        | XXXXXXXXXXXXXXXXX  |
| RoomID \*     | INT(20)      | ID of Room                        | 123450000000000004 |
| RoomtypeID \* | INT(20)      | ID of RoomType                    | 123450000000000006 |
| FromDate \*   | Date         | From date. \[Format: yyyy-mm-dd\] | 2020-05-15         |
| ToDate \*     | Date         | To date. \[Format: yyyy-mm-dd\]   | 2020-05-16         |

**Request **

``` json
{
"RES_Request": {
"Request_Type": "UnblockRoom",
"Authentication": {
"HotelCode": "xxxx",
"AuthCode": "xxxxxxxxxxxx"
},
"Rooms": [
{
"RoomID": "123450000000000004",
"RoomtypeID":"123450000000000006",
"FromDate": "2020-05-15",
"ToDate": "2020-05-16"
},
{
"RoomID": "123450000000000004",
"RoomtypeID": "123450000000000007",
"FromDate": "2020-05-19",
"ToDate": "2020-05-22"
}
]}
}
```

**Response**

|                     |               |                                   |                                                                       |
|---------------------|---------------|-----------------------------------|-----------------------------------------------------------------------|
| **Name**            | **Data Type** | **Description **                  | **Example**                                                           |
| Success.SuccessMsg  | –             | Generate Success Response Message | Rooms Unblocked Successfully                                          |
| Errors.ErrorCode    | –             | Response Error Code               | 0, 301 etc                                                            |
| Errors.ErrorMessage | –             | Generate Response Message         | Unauthorized Request. Please check hotel code and authentication code |

**Success**

``` json
{
"Errors": {
"ErrorCode": "0",
"ErrorMessage": "Success"
},
"Success": {
"SuccessMsg": "Rooms Unblocked Successfully"
}
}
```

**Error** **Codes**

|                |                                                                                                                    |
|----------------|--------------------------------------------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                                                                     |
| 100            | Missing required parameters                                                                                        |
| 500            | Error occurred during processing.                                                                                  |
| 502            | Request Type is missing                                                                                            |
| 101            | Hotel Code is missing                                                                                              |
| 102            | Authentication Code is missing                                                                                     |
| 103            | Room ID is missing                                                                                                 |
| 104            | Roomtype ID is missing                                                                                             |
| 105            | From Date is missing.                                                                                              |
| 106            | From Date is not a valid date                                                                                      |
| 107            | To Date is missing                                                                                                 |
| 301            | Unauthorized Request. Please check hotel code and authentication code                                              |
| 302            | Unauthorized Request. Integration is not allowed                                                                   |
| 303            | Auth Code is inactive                                                                                              |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code                                       |
| 202            | Unauthorized request. Hotel code is not active                                                                     |
| 108            | (To Date) – To Date is not a valid date                                                                            |
| 109            | From Date (From Date) To Date : (To Date) – Please check From and To date. To Date should be greater than fromdate |
| 110            | Unblock is not allowed for past dates. Your property current working date is (Hoteldate)                           |
| 128            | (Room ID) – There is no block on this room, so unblock is not possible.                                            |

---



<!-- ====================================================================== -->


# Finance

> eZee / YCS Connectivity API — `FIN` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

Use the finance API to settle your accounts.

**11 endpoints in this file:** FIN-01 Retrieve Extras, FIN-02 Retrieve Hotel Expenses, FIN-03 Retrieve Bills, FIN-04 Retrieve Financial Accounts, FIN-05 Retrieve Revenues, FIN-06 Retrieve Outwards Payments, FIN-07 Retrieve Inwards Payments, FIN-08 Retrieve Journals, FIN-09 Retrieve Incidental Invoices, FIN-10 Retrieve Outwards Folio wise Payments, FIN-11 Retrieve Inwards Folio wise Payments

---

### FIN-01 · Retrieve Extras

**Request\_Type:** `ExtraCharges`  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ExtraCharges&HotelCode=XXX&APIKey=XXX&language=en`  ·  **eZee ref:** #592

*Tags: Meta Search, Open*

This API provides information of extra services available at your property which can be used in mapping or display purposes in the external applications. The API can return data in JSON formats.

**URI Request**

Request parameters are supplied by appending a question mark (?) to the base URI, followed by a sequence of parameter names and values separated by an ampersand (&).

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?[Request_Type]&HotelCode=[Hotel_Code]&APIKey=[API_KEY]&language=[LANGUAGE];
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td>–</td>
<td>Use Keyword “ExtraCharges”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[LANGUAGE]</td>
<td>VARCHAR(20)</td>
<td>[Optional] Default is en.<br />
Pass language code. Language codes are available <a href="https://api.ezeetechnosys.com/#section-lan">here</a>.</td>
<td>en</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?request_type=ExtraCharges&HotelCode=XXX&APIKey=XXX&language=en

****Response****

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>ExtraChargeId</td>
<td>Integer(20)</td>
<td>Unique id of ExtraCharge</td>
<td>XXXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>ShortCode</td>
<td>String</td>
<td>ShortCode of ExtraCharge</td>
<td>Transport</td>
</tr>
<tr class="even">
<td>charge</td>
<td>String</td>
<td>ExtraCharge name</td>
<td>Welcome Drink</td>
</tr>
<tr class="odd">
<td>Description</td>
<td>String</td>
<td>ExtraCharge Description</td>
<td></td>
</tr>
<tr class="even">
<td>Rate</td>
<td>Decimal</td>
<td>ExtraCharge Rate</td>
<td>100</td>
</tr>
<tr class="odd">
<td>CharegeRule</td>
<td>String</td>
<td>Rule of ExtraCharge</td>
<td>PERQUANTITY</td>
</tr>
<tr class="even">
<td>PostingRule</td>
<td>String</td>
<td>Rule of posting ExtraCharge</td>
<td>ONLYCHECKOUT</td>
</tr>
<tr class="odd">
<td>ValidFrom</td>
<td>Date</td>
<td>From date of ExtraCharge is valid</td>
<td>2020-02-03</td>
</tr>
<tr class="even">
<td>ValidTo</td>
<td>Date</td>
<td>To Date of Extracharge is valid</td>
<td>2020-03-03</td>
</tr>
<tr class="odd">
<td>ischargealways</td>
<td>integer(1)</td>
<td>Is always charge or not,<br />
0: not always charge,<br />
1: always charge</td>
<td>0 or 1</td>
</tr>
<tr class="even">
<td>applyon_rateplan</td>
<td>Integer(20)</td>
<td>Rateplanid where ExtraCharge applied or ALL</td>
<td>XXXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="odd">
<td>applyon_special</td>
<td>Integer(20)</td>
<td>Specialid where ExtraCharge applied or ALL</td>
<td>ALL</td>
</tr>
</tbody>
</table>

**Success**

``` json
[
{
"ExtraChargeId": "XXXXXXXXXXXXXXXXXX",
"ShortCode": "Bottle of Wine on Arrival", "charge": "Bottle of Wine on Arrival", "description": null,
"Rate": "500.0000", "ChargeRule": "PERQUANTITY",
"PostingRule": "ONLYCHECKOUT", "ValidFrom": null,
"ValidTo": null, "ischargealways": "0",
"applyon_rateplan": "XXXXXXXXXXXXXXXXXX", "applyon_special": ""
},
{
"ExtraChargeId": "XXXXXXXXXXXXXXXXXX",
"ShortCode": "Transport", "charge": "Transport Services", "description": null,
"Rate": "500.0000",
"ChargeRule": "PERBOOKING", "PostingRule": "ONLYCHECKIN", "ValidFrom": null,
"ValidTo": null, "ischargealways": "0", "applyon_rateplan": "ALL", "applyon_special": "ALL"
}
]
```

**Error** **Codes**

|                         |                                                                                                                                                  |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**          | **Error Name**                                                                                                                                   |
| HotelCodeEmpty          | Hotel code is empty.                                                                                                                             |
| NORESACC                | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ               | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                       | Cannot Parse Request                                                                                                                             |
| 5                       | Recoverable Error. Equivalent to http 503.                                                                                                       |
| CheckDate               | Check out date should be greater than Check in date                                                                                              |
| DBConnectError          | Database not connected.                                                                                                                          |
| getExtraChargeListError | Extra Charge List error                                                                                                                          |
| -1                      | No Data found.                                                                                                                                   |
| APIACCESSDENIED         | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| ParametersMissing       | Missing parameters.                                                                                                                              |
| UnknownError            | Unknown Error                                                                                                                                    |
| 4                       | Timeout requested. Stops requests for the specified time.                                                                                        |
| InvalidHotelCode        | Invalid Hotel code.Please check your property code.                                                                                              |
| BadRequest              | Bad request type.                                                                                                                                |

---

### FIN-02 · Retrieve Hotel Expenses

**Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.voucher`  ·  **Content-Type:** application/json  ·  **eZee ref:** #802

*Tags: Open*

This API provides you with detailed information on all expenses for a property. The API can return data in CSV formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.voucher](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

| Name         | Data Type    | Description                | Example           |
|--------------|--------------|----------------------------|-------------------|
| HotelCode \* | INT(11)      | Unique Hotel code          | XXXX              |
| AuthCode \*  | VARCHAR(300) | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| FromDate \*  | Date         | Date From                  | 2020-07-01        |
| ToDate \*    | Date         | Date To                    | 2020-07-10        |

**Request **

``` json
{
        
        "authcode": "xxxxxxxxxxxx",
        "hotel_code":"xxxx",
        "fromdate": "2020-02-01",
        "todate": "2020-03-01"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Hotel Name</td>
<td>String</td>
<td>Name of Hotel</td>
<td>Hotel Name</td>
</tr>
<tr class="odd">
<td>Hotel Code</td>
<td>Integer</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="even">
<td>Voucher Date</td>
<td>Date</td>
<td>Date of Voucher</td>
<td>2020-05-02</td>
</tr>
<tr class="odd">
<td>Voucher No</td>
<td>Integer</td>
<td>Voucher number</td>
<td>1</td>
</tr>
<tr class="even">
<td>Contact Info</td>
<td>String</td>
<td>Contact information</td>
<td>Michele B. Wiese</td>
</tr>
<tr class="odd">
<td>Expense Made To</td>
<td>String</td>
<td>Expense made to</td>
<td>GUEST</td>
</tr>
<tr class="even">
<td>Paid Out</td>
<td>String</td>
<td>Paid out for</td>
<td>Laundry Bill</td>
</tr>
<tr class="odd">
<td>Paid Out Charges</td>
<td>Decimal</td>
<td>Paid Out Charges amount</td>
<td>100</td>
</tr>
<tr class="even">
<td>Paid Out Currency</td>
<td>String</td>
<td>Currency of Paid out</td>
<td>$</td>
</tr>
<tr class="odd">
<td>Payment Mode</td>
<td>String</td>
<td>Mode of payment</td>
<td>Cash<br />
</td>
</tr>
<tr class="even">
<td>Payment Charges</td>
<td>Decimal</td>
<td>Payment Charges</td>
<td>10<br />
</td>
</tr>
<tr class="odd">
<td>Payment Currency</td>
<td>String</td>
<td>Currency of Payment</td>
<td>$<br />
</td>
</tr>
</tbody>
</table>

**Success**

    "HotelName","HotelCode","VoucherDate","VoucherNo","ContactInfo","ExpenseMadeTo","PaidOut","PaidOutCharges","PaidOutCurrency","PaymentMode","PaymentCharges","PaymentCurrency",
    "Hotel","xxxx","2020-03-18","3","Mr. Michele B. Wiese","GUEST","Laundry Bill","680","$","Cash,Cash,Cash","-680","$",

**Error** **Codes**

    Property Deactivated: This property has been deactivated
    OpenAPI Record invalid: Unauthorized Request. Please check hotel code and authentication code
    OpenAPI Deactivated: Auth Code is inactive.
    OpenAPI Request: Property is not authorized to access this api.

---

### FIN-03 · Retrieve Bills

**Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.posting`  ·  **Content-Type:** application/json  ·  **eZee ref:** #805

*Tags: Open*

A Bill is a container of charges, deposits and payments. This API provides you the detail information of all items posted on the booking invoices. The API can return data in CSV formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.posting](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

| Name         | Data Type    | Description                | Example           |
|--------------|--------------|----------------------------|-------------------|
| HotelCode \* | INT(11)      | Unique Hotel code          | XXXX              |
| AuthCode \*  | VARCHAR(300) | Unique Authentication code | XXXXXXXXXXXXXXXXX |
| FromDate \*  | Date         | Date From                  | 2020-07-01        |
| ToDate \*    | Date         | Date To                    | 2020-07-10        |

**Request **

``` json
{
        
        "authcode": "xxxxxxxxxxxx",
        "hotel_code":"xxxx",
        "fromdate": "2020-02-01",
        "todate": "2020-03-01"
}
```

**Response**

|                       |               |                            |                                     |
|-----------------------|---------------|----------------------------|-------------------------------------|
| **Name**              | **Data Type** | **Description **           | **Example**                         |
| Unique id             | String        | Unique id                  | UNK_123450000000000003_2020-03-28_4 |
| Hotel Name            | String        | Name of Hotel              | Hotel Name                          |
| Hotel Code            | Integer       | Hotel unique code          | xxxx                                |
| Folio No              | Integer       | Folio number               | 1                                   |
| Date                  | Date          | Folio date                 | 2020-02-03                          |
| Voucher No/Receipt No | Integer       | Voucher/Receipt number     | 3                                   |
| Invoice Number        | String        | Invoice Number             | A5                                  |
| Guest Name            | String        | Guest Full Name            | Mr. John                            |
| Bill To Name          | String        | Guest/Business Name        | ABC Company                         |
| Guest GST Number      | String        | Guest GST Number           | xxxxxxxxxxxx                        |
| State                 | String        | State Name                 | Maharastra                          |
| Phone Number          | String        | Guest Phone Number         | 123456789                           |
| Mobile Number         | String        | Guest Mobile Number        | 123456789                           |
| Type                  | String        | Folio type                 | Extra Charges                       |
| Particular            | String        | Particular folio           | Welcome Drink                       |
| Qty                   | Integer       | Particular quantity        | 1                                   |
| Currency              | String        | Folio Currency             | \$                                  |
| Amount                | Decimal       | folio amount               | 100                                 |
| GST Rate              | Float         | Total GST Rate             | 20,22.5 etc                         |
| CGST Tax Amount       | Float         | CGST Tax Amount            | 10,100.10 etc                       |
| SGST Tax Amount       | Float         | SGST Tax Amount            | 10,100.10 etc                       |
| IGST Tax Amount       | Float         | IGST Tax Amount            | 10,100.10 etc                       |
| Service Tax           | Decimal       | Service Tax Amount         | 10                                  |
| Luxury Tax            | Decimal       | Luxury Tax Amount          | 10                                  |
| Discount              | Decimal       | Discount Amount            | 0                                   |
| Adjustment            | Decimal       | Adjustment Amount          | 0                                   |
| Total                 | Decimal       | Total Amount               | 120                                 |
| Is Advance Deposit    | String        | Is advance deposit         | Yes                                 |
| Is Inclusion          | String        | Is Tax inclusion in amount | Yes                                 |
| Posted By             | String        | Posted By                  | admin                               |

**Success**

    "Unique id","Hotel Name","Hotel Code","Folio No","Date","VoucherNo/ReceiptNo","Invoice Number","Guest Name","Bill To Name","Guest GST Number","State","Phone Number","Mobile Number","Type","Particular","Qty","Currency","Amount","GST Rate","CGST Tax Amount","SGST Tax Amount","IGST Tax Amount","Service Tax","Luxury Tax","Discount","Adjustment","Total","Is Advance Deposit","Is Inclusion","Posted By",
    "UNK_123450000000104586","Hotel","xxxx","1484","2020-12-01","504-1","5220","Mr. John","Mr. John","","","123456789","123456789","Bank","Cheque","","Rs","-2200","0","0","0","0","0","0","0","0","-2200","Yes","No","admin",
    "UNK_123450000000104547","Hotel","xxxx","1484","2021-02-28","","5220","Mr. John","ABC Company","","","123456789","123456789","Room Charges","Room Charges","","Rs","1964.28","12","117.86","117.86","0","0","0","0","0","2200","","No","admin",

**Error** **Codes**

    Property Deactivated: This property has been deactivated
    OpenAPI Record invalid: Unauthorized Request. Please check hotel code and authentication code
    OpenAPI Deactivated: Auth Code is inactive.
    OpenAPI Request: Property is not authorized to access this api.

---

### FIN-04 · Retrieve Financial Accounts

**Request\_Type:** `XERO_GET_CONFIG_DATA`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #1719

*Tags: Open*

This API provides a financial accounts list  for a property. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                            |                      |
|--------------|---------------|----------------------------|----------------------|
| **Name**     | **Data Type** | **Description**            | **Example**          |
| hotel_code\* | INT(11)       | Unique Hotel code          | xxxx                 |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code | xxxxxxxxxx           |
| requestfor\* | VARCHAR(100)  | Request Type               | XERO_GET_CONFIG_DATA |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "requestfor": "XERO_GET_CONFIG_DATA"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>descriptionunkid</td>
<td>String</td>
<td>The Id is getting based on below data.If descriptiontype is <strong>RATE TYPE</strong>, then you will get <strong>RATE TYPE ID</strong></td>
<td>1234500000000000004</td>
</tr>
<tr class="odd">
<td>description</td>
<td>String</td>
<td>The description is getting based on the below data.If descriptiontype is <strong>RATE TYPE</strong>, then you will get <strong>RATE TYPE NAME</strong></td>
<td>Daily</td>
</tr>
<tr class="even">
<td>descriptiontypeunkid</td>
<td>String</td>
<td>It is pre-defined unique Id</td>
<td>1</td>
</tr>
<tr class="odd">
<td>descriptiontype</td>
<td>String</td>
<td>Description type id and description type name is below listed according to Header Id and name<br />
<strong>Header-1: Room Revenue</strong><br />
1: SINGLE LEDGER<br />
2: ROOM NAME<br />
3: ROOM TYPE<br />
4: RATE TYPE<br />
5: ROOM CHARGE<br />
6: TAX<br />
7: SOURCE<br />
8: MARKET CODE<br />
<br />
<strong>Header-2: Extra Charges<br />
</strong>1: SINGLE LEDGER<br />
2: EXTRA CHARGE<strong><br />
<br />
Header-3: Discount<br />
</strong>1: SINGLE LEDGER<br />
2: DISCOUNT<strong><br />
<br />
Header-4: Adjustment</strong><br />
1: SINGLE LEDGER<br />
<br />
<strong>Header-5: Taxes</strong><br />
1: SINGLE LEDGER<br />
2: TAX<br />
<br />
<strong>Header-6: Payment Type</strong><br />
1: SINGLE LEDGER<br />
2: Payment Type<br />
<br />
<strong>Header-7: Folio Transfer</strong><br />
1: SINGLE LEDGER<br />
<br />
<strong>Header-8: Guest Ledger</strong><br />
1: SINGLE LEDGER<br />
3: BUSINESS SOURCE<br />
4: ROOM NAME<br />
5: ROOM TYPE<br />
<br />
<strong>Header-9: Guest Ledger – Customer</strong><br />
1: SINGLE LEDGER<br />
<br />
<strong>Header-10: City Ledger</strong><br />
1: SINGLE LEDGER<br />
2: City Ledger<br />
<br />
<strong>Header-11: City Ledger – Customer</strong><br />
1: SINGLE LEDGER<br />
2: City Ledger<br />
<br />
<strong>Header-12: City Ledger Contra</strong><br />
1: SINGLE LEDGER<br />
<br />
<strong>Header-13: Advance From Guest</strong><br />
1: SINGLE LEDGER<br />
<br />
<strong>Header-14: Cost Center</strong><br />
1: SINGLE LEDGER<br />
2: ROOM NAME<br />
<br />
<strong>Header-15: Room Posting</strong><br />
1: SINGLE LEDGER<br />
3: Tax Percentage<br />
<br />
<strong>Header-16: Paid Out</strong><br />
1: SINGLE LEDGER<br />
2: Paid Out</td>
<td>SINGLE LEDGER, ROOM NAME, RATE TYPE</td>
</tr>
<tr class="even">
<td>headerid</td>
<td>String</td>
<td>It is pre-defined unique Id</td>
<td>1</td>
</tr>
<tr class="odd">
<td>header</td>
<td>String</td>
<td>Header-1: Room Revenue<br />
Header-2: Extra Charges<br />
Header-3: Discount<br />
Header-4: Adjustment<br />
Header-5: Taxes<br />
Header-6: Payment Type<br />
Header-7: Folio Transfer<br />
Header-8: Guest Ledger<br />
Header-9: Guest Ledger – Customer<br />
Header-10: City Ledger<br />
Header-11: City Ledger – Customer<br />
Header-12: City Ledger Contra<br />
Header-13: Advance From Guest<br />
Header-14: Cost Center<br />
Header-15: Room Posting<br />
Header-16: Paid Out</td>
<td>Room Revenue</td>
</tr>
</tbody>
</table>

**Success**

``` json
[
{
     "descriptionunkid": "1",
     "description": "Revenue",
     "descriptiontypeunkid": "1",
     "descriptiontype": "SINGLE LEDGER",
     "headerid": "1",
     "header": "Room Revenue"
},
{
    "descriptionunkid": "123400000000000006",
    "description": "30 Flat",
    "descriptiontypeunkid": "2",
    "descriptiontype": "TAX",
    "headerid": "5",
    "header": "Taxes"
 },

{
     "descriptionunkid": "123400000000000001",
     "description": "Daily",
     "descriptiontypeunkid": "4",
     "descriptiontype": "RATE TYPE",
     "headerid": "1",
     "header": "Room Revenue"
},
{
    "descriptionunkid": "123400000000000001",
    "description": "Managers Open Discount",
    "descriptiontypeunkid": "2",
    "descriptiontype": "DISCOUNT",
    "headerid": "3",
    "header": "Discount"
 }
]
```

**Error** **Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---

### FIN-05 · Retrieve Revenues

**Request\_Type:** `XERO_GET_TRANSACTION_DATA`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #1733

*Tags: Open*

This API provides revenue information for a property that can be used in your financial accounts. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                                   |                           |
|--------------|---------------|-----------------------------------|---------------------------|
| **Name**     | **Data Type** | **Description**                   | **Example**               |
| hotel_code\* | INT(11)       | Unique Hotel code                 | xxxx                      |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code        | xxxxxxxxxx                |
| fromdate     | DATE          | From date. \[Format: yyyy-mm-dd\] | 2020-03-01                |
| todate       | DATE          | To date. \[Format: yyyy-mm-dd\]   | 2020-03-31                |
| ischeckout   | VARCHAR(300)  | It is a flag for check out.       | True/False                |
| requestfor\* | VARCHAR(100)  | Request Type                      | XERO_GET_TRANSACTION_DATA |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "fromdate" : "2020-03-01",
  "todate" : "2020-03-30",
  "ischeckout" : "true",
  "requestfor": "XERO_GET_TRANSACTION_DATA"
}
```

**Response**

|                             |               |                                                                                                                                                               |                                                 |
|-----------------------------|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------|
| **Name**                    | **Data Type** | **Description **                                                                                                                                              | **Example**                                     |
| record_id                   | String        | Record/Unique Id                                                                                                                                              | S7-18                                           |
| record_date                 | Date          | Record Date                                                                                                                                                   | 2020-03-18                                      |
| reference1                  | Date          | Check In Date  \[Format: yyyy-mm-dd\]                                                                                                                         | 2020-03-17                                      |
| reference2                  | Date          | Check Out Date  \[Format: yyyy-mm-dd\]                                                                                                                        | 2020-03-18                                      |
| reference3                  | String        | Reservation No                                                                                                                                                | 7                                               |
| reference4                  | String        | Folio No                                                                                                                                                      | 6                                               |
| reference5                  | String        | Guest Name                                                                                                                                                    | Alex Joy                                        |
| reference6                  | String        |                                                                                                                                                               | 0                                               |
| reference7                  | String        | Source                                                                                                                                                        |                                                 |
| reference8                  | String        | Bill No / Invoice No                                                                                                                                          | 0                                               |
| reference9                  | String        | Bill To                                                                                                                                                       |                                                 |
| reference10                 | String        | Voucher No                                                                                                                                                    |                                                 |
| reference11                 | String        |                                                                                                                                                               | 0                                               |
| reference12                 | String        |                                                                                                                                                               | 0                                               |
| reference13                 | String        | Room No                                                                                                                                                       | 103                                             |
| reference14                 | String        | Room Type                                                                                                                                                     | Twin                                            |
| reference15                 | String        | Rate Type                                                                                                                                                     | Frequent Traveller                              |
| reference16                 | String        | Market Code                                                                                                                                                   | Airline Crew                                    |
| reference17                 | String        | Identity type of billing contact.If Billing contact is guest,Company Tax ID of guest will be displayed and if Billing contact is company,it will be blank     | Passport                                        |
| reference18                 | String        | Identity number of billing contact. If Billing contact is a guest , the tax id of guest will be displayed and if Billing contact is company ,it will be blank | T9305602                                        |
| reference19                 | String        | Email of billing contact                                                                                                                                      | test@gmail.com                                  |
| reference20                 | String        | Address of billing contact                                                                                                                                    | Near railway station surat 396380 gujarat india |
| reference21                 | String        | Telephone of billing contact                                                                                                                                  | 0261242059                                      |
| detail-\>detail_record_id   | integer       | Rental ID                                                                                                                                                     | 1234500000000000038                             |
| detail-\>detail_record_date | Date          | Rental Date                                                                                                                                                   | 2020-03-17                                      |
| detail-\>reference_id       | integer       | List of Account Reference ID                                                                                                                                  | 1                                               |
| detail-\>reference_name     | String        | List of Account Reference Name                                                                                                                                |                                                 |
| detail-\>sub_ref1_id        | integer       | List of Account Sub Reference ID ‘Single Ledger’                                                                                                              | 1                                               |
| detail-\>sub_ref1_value     | String        | List of Account Sub Reference value ‘Always “1” when reference_id = 1                                                                                         | 1                                               |
| detail-\>sub_ref2_id        | integer       | List of Account Sub Reference ID  ‘Room Name wise                                                                                                             | 2                                               |
| detail-\>sub_ref2_value     | String        | List of Account Sub Reference value ‘Room Unique ID                                                                                                           | 1234500000000000003                             |
| detail-\>sub_ref3_id        | integer       | List of Account Sub Reference ID  ‘Room Type wise                                                                                                             | 3                                               |
| detail-\>sub_ref3_value     | String        | List of Account Sub Reference value ‘Room Type Unique ID                                                                                                      | 1234500000000000005                             |
| detail-\>sub_ref4_id        | integer       | List of Account Sub Reference ID  ‘Rate Type wise                                                                                                             | 4                                               |
| detail-\>sub_ref4_value     | String        | List of Account Sub Reference value ‘Rate Type Unique ID                                                                                                      | 1234500000000000003                             |
| detail-\>sub_ref5_id        | integer       | List of Account Sub Reference ID  ‘Room Charge wise \[Room Rent = 1, Cancellation Charge = 2, Day use = 3, Late checkout = 4 and No show charge = 5\]         | 5                                               |
| detail-\>sub_ref5_value     | String        | List of Account Sub Reference value ‘Room Unique ID’                                                                                                          | 1                                               |
| detail-\>sub_ref6_id        | integer       | List of Account Sub Reference ID  ‘Slab Tax’ wise                                                                                                             | 6                                               |
| detail-\>sub_ref6_value     | String        | List of Account Sub Reference value ‘Tax Unique ID’                                                                                                           |                                                 |
| detail-\>sub_ref7_id        | integer       | List of Account Sub Reference ID  ‘Source wise’                                                                                                               | 7                                               |
| detail-\>sub_ref7_value     | String        | List of Account Sub Reference value ‘Source Unique ID’                                                                                                        |                                                 |
| detail-\>sub_ref8_id        | integer       | List of Account Sub Reference ID  ‘Market code wise’                                                                                                          | 8                                               |
| detail-\>sub_ref8_value     | String        | List of Account Sub Reference value ‘market Place Unique ID’                                                                                                  |                                                 |
| detail-\>amount             | String        | Amount                                                                                                                                                        | 1900.0000                                       |
| detail-\>taxper             | String        | Percentage of applied tax definition                                                                                                                          |                                                 |
| detail-\>slabtaxunkid       | String        | Slab Tax id                                                                                                                                                   | 1234500000000000013_1                           |
| detail-\>slabtax            | String        | Slab tax name                                                                                                                                                 | CGST                                            |
| detail-\>slab               | String        | Slab range                                                                                                                                                    | 1000-2499-12                                    |
| detail-\>charge_name        | String        | Charge name                                                                                                                                                   | Laundry                                         |
| detail-\>masterunkid        | integer       | Unique id                                                                                                                                                     | 1234500000000000015                             |
| detail-\>parentmasterunkid  | integer       | Unique id                                                                                                                                                     | 1234500000000000014                             |
| detail-\>description        | String        | description                                                                                                                                                   |                                                 |
| detail-\>Taxtype            | String        | Tax type                                                                                                                                                      |                                                 |
| detail-\>posdata            | String        | POS Data                                                                                                                                                      |                                                 |
| detail-\>POSTaxName         | String        | POS Tax name                                                                                                                                                  |                                                 |
| detail-\>POSTaxPercent      | String        | POS Tax Percentage                                                                                                                                            |                                                 |
| gross_amount                | Decimal       | (rent – rental dis. + rental tax + ex. charges – ex. discount + ex. tax)                                                                                      | 0                                               |
| flat_discount               | Decimal       | Folio level Discount                                                                                                                                          | 0                                               |
| adjustment_amount           | Decimal       | Adjustment                                                                                                                                                    | 0                                               |
| add_less_amount             | Decimal       |                                                                                                                                                               | 0                                               |
| total_amount                | Decimal       | (gross_amount – flat_discount + adjustment_amount)                                                                                                            | 2242.0000                                       |
| amount_paid                 | Decimal       | Paid Amount                                                                                                                                                   | 2242                                            |
| balance                     | Decimal       | (total amount – paid amount)                                                                                                                                  | 0                                               |

**Success**

``` json
[
    {
     "record_id": "S7-18",
     "record_date": "2020-03-18",
     "reference1": "2020-03-17",
     "reference2": "2020-03-18",
     "reference3": "7",
     "reference4": "6",
     "reference5": "Alex Joy",
     "reference6": "0",
     "reference7": "",
     "reference8": "9",
     "reference9": "",
     "reference10": "",
     "reference11": "0",
     "reference12": "0",
     "reference13": "103",
     "reference14": "Twin",
     "reference15": "Frequent Traveller",
     "reference16": "",
     "reference17": "Passport",
     "reference18": "T9305602",
     "reference19": "test@gmail.com",
     "reference20": "Near railway station surat 396380 gujarat india",
     "reference21": "0261242059",
     "detail": [
         {
             "detail_record_id": "1234500000000000038",
             "detail_record_date": "2020-03-17",
             "reference_id": 1,
             "reference_name": "Room Revenue",
             "sub_ref1_id": 1,
             "sub_ref1_value": 1,
             "sub_ref2_id": 2,
             "sub_ref2_value": "1234500000000000003",
             "sub_ref3_id": 3,
             "sub_ref3_value": "1234500000000000005",
             "sub_ref4_id": 4,
             "sub_ref4_value": "1234500000000000003",
             "sub_ref5_id": 5,
             "sub_ref5_value": 1,
             "sub_ref6_id": 6,
             "sub_ref6_value": "1234500000000000171_2",
             "sub_ref7_id": 7,
             "sub_ref7_value": "",
             "sub_ref8_id": 8,
             "sub_ref8_value": "",
             "amount": "1900.0000",
             "taxper": "",
             "slabtaxunkid": "1234500000000000171_2",
             "slabtax": "CGST",
             "slab": "1001-7500.99-12",
             "charge_name": "Room Charges",
             "masterunkid": "1234500000000000004",
             "parentmasterunkid": "",
             "description": "",
             "Taxtype": "",
             "posdata": "",
             "POSTaxName": "",
             "POSTaxPercent": ""

         },
         {
             "detail_record_id": "1234500000000000038",
             "detail_record_date": "2020-03-17",
             "reference_id": 5,
             "reference_name": "Taxes",
             "sub_ref1_id": 1,
             "sub_ref1_value": 1,
             "sub_ref2_id": 2,
             "sub_ref2_value": "1234500000000000003",
             "sub_ref3_id": 3,
             "sub_ref3_value": “1234500000000000171_2”,
             "sub_ref4_id": 0,
             "sub_ref4_value": 0,
             "sub_ref5_id": 0,
             "sub_ref5_value": 0,
             "sub_ref6_id": 0,
             "sub_ref6_value": 0,
             "sub_ref7_id": 0,
             "sub_ref7_value": 0,
             "sub_ref8_id": 0,
             "sub_ref8_value": 0,
             "amount": "342.0000",
             "taxper": "18.0000",
             "slabtaxunkid": "1234500000000000171_2",
             "slabtax": "CGST",
             "slab": "1001-7500.99-6",
             "charge_name": "CGST",
             "masterunkid": "1234500000000000004",
             "parentmasterunkid": "",
             "description": "",
             "Taxtype": "",
             "posdata": "",
             "POSTaxName": "",
             "POSTaxPercent": ""
         }
     ],
     "gross_amount": 0,
     "flat_discount": 0,
     "adjustment_amount": 0,
     "add_less_amount": 0,
     "total_amount": "2242.0000",
     "amount_paid": 2242,
     "balance": 0
},
]
```

**Error Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---

### FIN-06 · Retrieve Outwards Payments

**Request\_Type:** `XERO_GET_PAYMENT_DATA`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #1736

*Tags: Open*

This API provides outwards payments that can be used in your financial accounts. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                                  |                       |
|--------------|---------------|----------------------------------|-----------------------|
| **Name**     | **Data Type** | **Description**                  | **Example**           |
| hotel_code\* | INT(11)       | Unique Hotel code                | xxxx                  |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code       | xxxxxxxxxx            |
| fromdate     | DATE          | From date \[Format: yyyy-mm-dd\] | 2020-03-01            |
| todate       | DATE          | To date \[Format: yyyy-mm-dd\]   | 2020-03-31            |
| requestfor\* | VARCHAR(100)  | Request Type                     | XERO_GET_PAYMENT_DATA |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "fromdate" : "2020-03-01",
  "todate" : "2020-03-30",
  "requestfor": "XERO_GET_PAYMENT_DATA"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Response status</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data-&gt;type</td>
<td>String</td>
<td>Response type</td>
<td>General Expense, Advance Deposit Refund, Guest Refund, Cityledger Refund</td>
</tr>
<tr class="even">
<td>tranId</td>
<td>String</td>
<td>Transaction Id</td>
<td>P950-221</td>
</tr>
<tr class="odd">
<td>tran_datetime</td>
<td>Date</td>
<td>Transaction Date [Format: yyyy-mm-dd]</td>
<td>2020-03-22</td>
</tr>
<tr class="even">
<td>reference1</td>
<td>String</td>
<td>Bill No / Inv. No (For only General Expenses data)<br />
Receipt No (For only Advance Deposit Refund, Guest Refund, Cityledger Refund data)</td>
<td>12</td>
</tr>
<tr class="odd">
<td>reference2</td>
<td>String</td>
<td>Guest Name (For only General Expense,Advance Deposit Refund, Guest Refund data)</td>
<td>Johnson</td>
</tr>
<tr class="even">
<td>reference3</td>
<td>String</td>
<td>Reservation No (For only  Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference4</td>
<td>String</td>
<td>Reservation No (For only  Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference5</td>
<td>String</td>
<td>Folio No (For only  Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference6</td>
<td>String</td>
<td>Bill No / Invoice No</td>
<td>12</td>
</tr>
<tr class="even">
<td>reference7</td>
<td>String</td>
<td>Bill To (For only General Expense,Advance Deposit Refund, Guest Refund data)</td>
<td>Johnson</td>
</tr>
<tr class="odd">
<td>reference8</td>
<td>String</td>
<td>Arrival Date Time (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference9</td>
<td>String</td>
<td>Departure Date Time (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference10</td>
<td>String</td>
<td>Business Source Id (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference11</td>
<td>String</td>
<td>TravelAgent Voucher No (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference12</td>
<td>String</td>
<td>Market Code Id ( For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference13</td>
<td>String</td>
<td>Room Name (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference14</td>
<td>String</td>
<td>Folio Type / Settlement Type</td>
<td>CASH</td>
</tr>
<tr class="even">
<td>reference15</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference16</td>
<td>String</td>
<td>Not Applicable</td>
<td></td>
</tr>
<tr class="even">
<td>reference17</td>
<td>String</td>
<td>Identity type of billing contact. If Billing contact is guest,Company Tax ID of guest will be displayed and if Billing contact is company,it will be blank</td>
<td>Passport</td>
</tr>
<tr class="odd">
<td>reference18</td>
<td>String</td>
<td>Identity number of billing contact. If Billing contact is a guest, the tax id of guest will be displayed and if Billing contact is company , it will be blank</td>
<td>T9305602</td>
</tr>
<tr class="even">
<td>reference19</td>
<td>String</td>
<td>Email of billing contact</td>
<td>test@gmail.com</td>
</tr>
<tr class="odd">
<td>reference20</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station surat 396380 gujarat india</td>
</tr>
<tr class="even">
<td>reference21</td>
<td>String</td>
<td>Telephone of billing contact</td>
<td>0261242059</td>
</tr>
<tr class="odd">
<td>detail-&gt;tran_type</td>
<td>String</td>
<td>Transaction Type (Credit/Debit)</td>
<td>Cr/Dr</td>
</tr>
<tr class="even">
<td>detail-&gt;detailId</td>
<td>Integer</td>
<td>Detail Id</td>
<td>1234500000000000951</td>
</tr>
<tr class="odd">
<td>detail-&gt;reference_id</td>
<td>integer</td>
<td>Reference Id</td>
<td>6</td>
</tr>
<tr class="even">
<td>detail-&gt;reference_value</td>
<td>String</td>
<td>Transaction Mode</td>
<td>Advance,Payment, Paid Out</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference1_id</td>
<td>integer</td>
<td>Single Ledger Id</td>
<td>1</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference1_value</td>
<td>String</td>
<td>Single Ledger Value</td>
<td>1</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference2_id</td>
<td>integer</td>
<td></td>
<td>2</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference2_value</td>
<td>String</td>
<td>Expense Type Id, Tax Id (For Only General Expensel )<br />
City Ledger Id, Payment Id (All API) <br />
Guest Name (For Only Guest Refund in debit transaction type)</td>
<td>1234500000000000155</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference3_id</td>
<td>integer</td>
<td></td>
<td>3</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference3_value</td>
<td>String</td>
<td>Business Source Id (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference4_id</td>
<td>integer</td>
<td></td>
<td>4</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference4_value</td>
<td>String</td>
<td>Room Id (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference5_id</td>
<td>integer</td>
<td></td>
<td>5</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference5_value</td>
<td>String</td>
<td>Rate Type Id (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference6_id</td>
<td>integer</td>
<td></td>
<td>6</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference6_value</td>
<td>String</td>
<td>Folio No (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference7_id</td>
<td>integer</td>
<td></td>
<td>7</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference7_value</td>
<td>String</td>
<td>Bill To (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference8_id</td>
<td>integer</td>
<td></td>
<td>8</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference8_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;amount</td>
<td>Decimal</td>
<td>Transaction Amount</td>
<td>1900.0000</td>
</tr>
<tr class="even">
<td>detail-&gt;slabtaxunkid</td>
<td>String</td>
<td>IF General Expense type found then add Slab Tax id</td>
<td>1234500000000000013_1</td>
</tr>
<tr class="odd">
<td>detail-&gt;slabtax</td>
<td>String</td>
<td>IF General Expense type found then add Slab tax name</td>
<td>CGST</td>
</tr>
<tr class="even">
<td>detail-&gt;slab</td>
<td>String</td>
<td>IF General Expense type found then add Slab range</td>
<td>1000-2499-12</td>
</tr>
<tr class="odd">
<td>gross_amount</td>
<td>Decimal</td>
<td>Gross Amount</td>
<td>0</td>
</tr>
<tr class="even">
<td>amount_paid</td>
<td>Decimal</td>
<td>Amount Paid (For Only General Expense)</td>
<td>2242</td>
</tr>
<tr class="odd">
<td>balance</td>
<td>Decimal</td>
<td>Account Balance (For Only General Expense)</td>
<td>0</td>
</tr>
<tr class="even">
<td>remark</td>
<td>String</td>
<td>Comment of transaction</td>
<td></td>
</tr>
</tbody>
</table>

**Success**

``` json
{
    "status": "Success",
    "data": [
        {
            "type": "General Expense",
            "data": [
                {
                    "tranId": "P950-221",
                    "tran_datetime": "2020-03-22",
                    "reference1": "12",
                    "reference2": "Johnson",
                    "reference3": "",
                    "reference4": "",
                    "reference5": "",
                    "reference6": "12",
                    "reference7": "Johnson",
                    "reference8": "",
                    "reference9": "",
                    "reference10": "",
                    "reference11": "",
                    "reference12": "",
                    "reference13": "",
                    "reference14": "CASH",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Passport",
                    "reference18": "T9305602",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station surat 396380 gujarat india",
                    "reference21": "0261242059",
                    "detail": [
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000951",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000155",
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": 1500,
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        },
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000950",
                            "reference_id": 16,
                            "reference_value": "Paid Out",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000002",
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": "1500.0000",
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        }
                    ],
                    "gross_amount": 1500,
                    "amount_paid": 1500,
                    "balance": 0,
                    "remark": ""
                }                
            ]
        },
        {
            "type": "Advance Deposit Refund",
            "data": [
                {
                    "tranId": "P949-221",
                    "tran_datetime": "2020-03-22 00:00:00",
                    "reference1": "53",
                    "reference2": "Eliya",
                    "reference3": "50",
                    "reference4": "50",
                    "reference5": "54",
                    "reference6": "45",
                    "reference7": "Mrs. Eliya",
                    "reference8": "2020-03-24",
                    "reference9": "2020-03-28",
                    "reference10": "Mark Tour and Travels",
                    "reference11": "",
                    "reference12": "",
                    "reference13": "108",
                    "reference14": "",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station surat 396380 gujarat india",
                    "reference21": "0261242059",
                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000948",
                            "reference_id": 13,
                            "reference_value": "Advance",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 0,
                            "sub_reference2_value": 0,
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": 2640
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000948",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000155",
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": 2640
                        }
                    ],
                    "gross_amount": 2640,
                    "remark": ""
                }
            ]
        },
        {
            "type": "Guest Refund",
            "data": [{
                           "tranId": "3",
                           "tran_datetime": "2020-06-06 12:10:00",
                           "reference1": "VOC-003",
                           "reference2": "Guest/Person Name",
                           "reference3": "BKN-13",
                           "reference4": "RN-13",
                           "reference5": "FN-13",
                           "reference6": "BL-13",
                           "reference7": "Bill to Name",
                           "reference8": "2020-06-06",
                           "reference9": "2020-06-07",
                           "reference10": "Business Source Name",
                           "reference11": "OTA Booking Voucher number",
                           "reference12": "Market Name",
                           "reference13": "103",
                           "reference14": "Cash",
                           "reference15": "Credit Number",
                           "reference16": "",
                           "reference17": "Passport",
                           "reference18": "T9305602",
                           "reference19": "test@gmail.com",
                           "reference20": "Near railway station,surat-396380,gujarat,india",
                           "reference21": "0261242059",
          "detail": [
                       {
                          "tran_type": "Dr",
                          "detailId": "3-1",
                          "reference_id": "8",
                          "reference_value": "Guest Ledger",
                          "sub_reference1_id": "1",
                          "sub_reference1_value": "1",
                          "sub_reference2_id": "2",
                          "sub_reference2_value": "Guest Name",
                          "sub_reference3_id": "3",
                          "sub_reference3_value": "buss01",
                          "sub_reference4_id": "4",
                          "sub_reference4_value": "1234500000000000150",
                          "sub_reference5_id": "5",
                          "sub_reference5_value": "1234500000000000006",
                          "sub_reference6_id": "6",
                          "sub_reference6_value": "fn-001",
                          "sub_reference7_id": "7",
                          "sub_reference7_value": "Bill to Name",
                          "sub_reference8_id": "0",
                          "sub_reference8_value": "0",
                          "amount": "1780.000"
                   },
                  {
                          "tran_type": "Cr",
                          "detailId": "3-1",
                          "reference_id": "6",
                          "reference_value": "Payment",
                          "sub_reference1_id": "1",
                          "sub_reference1_value": "1",
                          "sub_reference2_id": "2",
                          "sub_reference2_value": "1234500000000000156",
                          "sub_reference3_id": "0",
                          "sub_reference3_value": "0",
                          "sub_reference4_id": "0",
                          "sub_reference4_value": "0",
                          "sub_reference5_id": "0",
                          "sub_reference5_value": "0",
                          "sub_reference6_id": "0",
                          "sub_reference6_value": "0",
                          "sub_reference7_id": "0",
                          "sub_reference7_value": "0",
                          "sub_reference8_id": "0",
                          "sub_reference8_value": "0",
                          "amount": "1780.000"
                    }
                    ],
                         "gross_amount": "1780.0000",
                         "remark": ""
             }
             ]
       },
       {
         "type": "Cityledger Refund",
         "data": [{
                         "tranId": "4",
                         "tran_datetime": "2020-06-06 12:10:00",
                         "reference1": "VOC-004",
                         "reference2": "",
                         "reference3": "",
                         "reference4": "",
                         "reference5": "",
                         "reference6": "",
                         "reference7": "",
                         "reference8": "",
                         "reference9": "",
                         "reference10": "",
                         "reference11": "",
                         "reference12": "",
                         "reference13": "",
                         "reference14": "",
                         "reference15": "",
                         "reference16": "",
                         "reference17": "",
                         "reference18": "",
                         "reference19": "",
                         "reference20": "",
                         "reference21": "",
       "detail": [
                   {
                        "tran_type": "Dr",
                        "detailId": "4-1",
                        "reference_id": "10",
                        "reference_value": "City Ledger",
                        "sub_reference1_id": "1",
                        "sub_reference1_value": "1",
                        "sub_reference2_id": "2",
                        "sub_reference2_value": "1234500000000000156",
                        "sub_reference3_id": "0",
                        "sub_reference3_value": "0",
                        "sub_reference4_id": "0",
                        "sub_reference4_value": "0",
                        "sub_reference5_id": "0",
                        "sub_reference5_value": "0",
                        "sub_reference6_id": "0",
                        "sub_reference6_value": "0",
                        "sub_reference7_id": "0",
                        "sub_reference7_value": "0",
                        "sub_reference8_id": "0",
                        "sub_reference8_value": "0",
                        "amount": "2801.000"
               },
             {
                       "tran_type": "Cr",
                       "detailId": "4-1",
                       "reference_id": "6",
                       "reference_value": "Payment",
                       "sub_reference1_id": "1",
                       "sub_reference1_value": "1",
                       "sub_reference2_id": "2",
                       "sub_reference2_value": "1234500000000000158",
                       "sub_reference3_id": "0",
                       "sub_reference3_value": "0",
                       "sub_reference4_id": "0",
                       "sub_reference4_value": "0",
                       "sub_reference5_id": "0",
                       "sub_reference5_value": "0",
                       "sub_reference6_id": "0",
                       "sub_reference6_value": "0",
                       "sub_reference7_id": "0",
                       "sub_reference7_value": "0",
                       "sub_reference8_id": "0",
                       "sub_reference8_value": "0",
                       "amount": "2801.000"
              }
            ],
                      "gross_amount": "2801.0000",
                      "remark": ""
              }
            ]
        }
    ]
}
```

**Error Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---

### FIN-07 · Retrieve Inwards Payments

**Request\_Type:** `XERO_GET_RECEIPT_DATA`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #1738

*Tags: Open*

This API provides inwards payments (receipts data) that can be used in your financial accounts. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                                  |                       |
|--------------|---------------|----------------------------------|-----------------------|
| **Name**     | **Data Type** | **Description**                  | **Example**           |
| hotel_code\* | INT(11)       | Unique Hotel code                | xxxx                  |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code       | xxxxxxxxxx            |
| fromdate     | DATE          | From date \[Format: yyyy-mm-dd\] | 2020-03-01            |
| todate       | DATE          | To date \[Format: yyyy-mm-dd\]   | 2020-03-31            |
| requestfor\* | VARCHAR(100)  | Request Type                     | XERO_GET_RECEIPT_DATA |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "fromdate" : "2020-03-01",
  "todate" : "2020-03-30",
  "requestfor": "XERO_GET_RECEIPT_DATA"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Response status</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data-&gt;type</td>
<td>String</td>
<td>Response type</td>
<td>Advance Deposit,<br />
Received From Guest, Received From Cityledger</td>
</tr>
<tr class="even">
<td>tranId</td>
<td>String</td>
<td>Transaction Id</td>
<td>R946-22</td>
</tr>
<tr class="odd">
<td>tran_datetime</td>
<td>Date</td>
<td>Transaction Date [Format: yyyy-mm-dd]</td>
<td>2020-03-22</td>
</tr>
<tr class="even">
<td>reference1</td>
<td>Date</td>
<td>Receipt No (For only Advance Deposit data)</td>
<td>52</td>
</tr>
<tr class="odd">
<td>reference2</td>
<td>Date</td>
<td>Guest Name / Cityledger Name</td>
<td>Eliza</td>
</tr>
<tr class="even">
<td>reference3</td>
<td>String</td>
<td>Reservation No (For only Advance Deposit, Received From Guest data)</td>
<td>50</td>
</tr>
<tr class="odd">
<td>reference4</td>
<td>String</td>
<td>Reservation No  (For only Advance Deposit, Received From Guest data)</td>
<td>50</td>
</tr>
<tr class="even">
<td>reference5</td>
<td>String</td>
<td>Folio No <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>54</td>
</tr>
<tr class="odd">
<td>reference6</td>
<td>String</td>
<td>Bill No / Inv. No</td>
<td>45</td>
</tr>
<tr class="even">
<td>reference7</td>
<td>String</td>
<td>Bill To  (For only Advance Deposit, Received From Guest data</td>
<td>Eliza</td>
</tr>
<tr class="odd">
<td>reference8</td>
<td>String</td>
<td>Arrival Date Time <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>2020-03-24</td>
</tr>
<tr class="even">
<td>reference9</td>
<td>String</td>
<td>Departure Date Time <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>2020-03-28</td>
</tr>
<tr class="odd">
<td>reference10</td>
<td>String</td>
<td>Travel Agent/ Business Source <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>Apex Travels</td>
</tr>
<tr class="even">
<td>reference11</td>
<td>String</td>
<td>Travel Agent Voucher No <br />
(For only Advance Deposit, Received From Guest data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference13</td>
<td>String</td>
<td>Room Name <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>108</td>
</tr>
<tr class="even">
<td>reference14</td>
<td>String</td>
<td>Folio Type / Settlement Type (CASH/CREDIT) <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>CASH</td>
</tr>
<tr class="odd">
<td>reference15</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>reference16</td>
<td>String</td>
<td>Not Applicable</td>
<td></td>
</tr>
<tr class="odd">
<td>reference17</td>
<td>String</td>
<td>Identity type of billing contact.If Billing contact is guest,Company tax ID of guest will be displayed and if Billing contact is company, it will be blank</td>
<td>Passport</td>
</tr>
<tr class="even">
<td>reference18</td>
<td>String</td>
<td>Identity number of billing contact.If Billing contact is a guest,the tax id of guest will be displayed and if Billing contact is company ,it will be blank</td>
<td>T9305602</td>
</tr>
<tr class="odd">
<td>reference19</td>
<td>String</td>
<td>Email of billing contact</td>
<td>test@gmail.com</td>
</tr>
<tr class="even">
<td>reference20</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station, surat – 396380,gujarat, india</td>
</tr>
<tr class="odd">
<td>reference21</td>
<td>String</td>
<td>Telephone of billing contact</td>
<td>0261242059</td>
</tr>
<tr class="even">
<td>detail-&gt;tran_type</td>
<td>String</td>
<td>Transaction Type (Credit/Debit)</td>
<td>Cr/Dr</td>
</tr>
<tr class="odd">
<td>detail-&gt;detailId</td>
<td>Integer</td>
<td>Detail Id</td>
<td>1234500000000000946</td>
</tr>
<tr class="even">
<td>detail-&gt;reference_id</td>
<td>integer</td>
<td></td>
<td>6</td>
</tr>
<tr class="odd">
<td>detail-&gt;reference_value</td>
<td>String</td>
<td>Transaction Mode</td>
<td>Advance,Payment,<br />
Paid Out</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref1_id</td>
<td>integer</td>
<td></td>
<td>1</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref1_value</td>
<td>String</td>
<td></td>
<td>1</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref2_id</td>
<td>integer</td>
<td></td>
<td>2</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref2_value</td>
<td>String</td>
<td>City Ledger Contact Id, Payment Id<br />
Guest Name<br />
(For only Received From Guest in Credit transaction type data)</td>
<td>1234500000000000155</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref3_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref3_value</td>
<td>String</td>
<td>Business Source Id<br />
(For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref4_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref4_value</td>
<td>String</td>
<td>Room Id  (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref5_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref5_value</td>
<td>String</td>
<td>Room Type Id  (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref6_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref6_value</td>
<td>String</td>
<td>Folio No  (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref7_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref7_value</td>
<td>String</td>
<td>Bill To (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref8_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref8_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;amount</td>
<td>Decimal</td>
<td>Transaction Amount</td>
<td>200</td>
</tr>
<tr class="odd">
<td>gross_amount</td>
<td>Decimal</td>
<td>Gross Amount</td>
<td>200</td>
</tr>
<tr class="even">
<td>remark</td>
<td>String</td>
<td>Comment of transaction</td>
<td></td>
</tr>
</tbody>
</table>

**Success**

``` json
{
    "status": "Success",
    "data": [
        {
            "type": "Advance Deposit",
            "data": [
                {
                    "tranId": "R946-22",
                    "tran_datetime": "2020-03-22",
                    "reference1": "52",
                    "reference2": "Eliza,
                    "reference3": "50",
                    "reference4": "50",
                    "reference5": "54",
                    "reference6": "45",
                    "reference7": "Eliza",
                    "reference8": "2020-03-24",
                    "reference9": "2020-03-28",
                    "reference10": "Apex Travels",
                    "reference11": "",
                    "reference13": "108",
                    "reference14": "Cash",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",  
                    "reference18": "", 
                    "reference19": "test@gmail.com", 
                    "reference20": "Near railway station,surat-396380,gujarat, india", 
                    "reference21": "026142059",
                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000946",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000155",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": "25000.0000"
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000946",
                            "reference_id": 13,
                            "reference_value": "Advance",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 0,
                            "sub_ref2_value": 0,
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": "25000.0000"
                        }
                    ],
                    "gross_amount": "25000.0000",
                    "remark": ""
                }
            ]
        },
        {
            "type": "Received From Guest",
            "data": [
                {
                    "tranId": "R355-21",
                    "tran_datetime": "2020-03-21",
                    "reference1": "39",
                    "reference2": "Loy",
                    "reference3": "42",
                    "reference4": "42",
                    "reference5": "45",
                    "reference6": "20",
                    "reference7": "Loy",
                    "reference8": "2020-03-19",
                    "reference9": "2020-03-21",
                    "reference10": "Apex Travels",
                    "reference11": "",
                    "reference13": "113",
                    "reference14": "Cash",
                    "reference15": "",
                    "reference16": "", 
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station, surat-396380,gujarat,india",
                    "reference21": "026142059",
                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000355",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000155",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 8310
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000355",
                            "reference_id": 8,
                            "reference_value": "Guest Ledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "Loy",
                            "sub_ref3_id": 3,
                            "sub_ref3_value": "1234500000000000010",
                            "sub_ref4_id": 4,
                            "sub_ref4_value": "1234500000000000013",
                            "sub_ref5_id": 5,
                            "sub_ref5_value": "1234500000000000002",
                            "sub_ref6_id": 6,
                            "sub_ref6_value": "45",
                            "sub_ref7_id": 7,
                            "sub_ref7_value": "Loy",
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 8310
                        }
                    ],
                    "gross_amount": 8310,
                    "remark": ""
                }
            ]
        },
        {
            "type": "Received From Cityledger",
            "data": [
                {
                    "tranId": "R363-21",
                    "tran_datetime": "2020-03-21",
                    "reference1": "42",
                    "reference2": "Apex Travels",
                    "reference3": "",
                    "reference4": "",
                    "reference5": "",
                    "reference6": "",
                    "reference7": "",
                    "reference8": "",
                    "reference9": "",
                    "reference10": "",
                    "reference11": "",
                    "reference13": "",
                    "reference14": "",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station,surat-396380,gujarat,india",
                    "reference21": "0261242059",

                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000363",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000155",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 200
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000363",
                            "reference_id": 10,
                            "reference_value": "Cityledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000020",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 200
                        }
                    ],
                    "gross_amount": 200,
                    "remark": ""
                }
            ]
        }
    ]
}
```

**Error Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---

### FIN-08 · Retrieve Journals

**Request\_Type:** `XERO_GENERAL_JOURNAL_INFO`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #1741

*Tags: Open*

This API provides journal data that can be used in your financial accounts. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                                  |                           |
|--------------|---------------|----------------------------------|---------------------------|
| **Name**     | **Data Type** | **Description**                  | **Example**               |
| hotel_code\* | INT(11)       | Unique Hotel code                | xxxx                      |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code       | xxxxxxxxxx                |
| fromdate     | DATE          | From date \[Format: yyyy-mm-dd\] | 2020-03-01                |
| todate       | DATE          | To date \[Format: yyyy-mm-dd\]   | 2020-03-31                |
| requestfor\* | VARCHAR(100)  | Request Type                     | XERO_GENERAL_JOURNAL_INFO |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "fromdate" : "2020-03-01",
  "todate" : "2020-03-30",
  "requestfor": "XERO_GENERAL_JOURNAL_INFO"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Response status</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data-&gt;type</td>
<td>String</td>
<td>Response type</td>
<td>Advance Deposit Transfer,<br />
Folio Transfer, Cityledger Transfer, Cityledger Commision</td>
</tr>
<tr class="even">
<td>tranId</td>
<td>String</td>
<td>Transaction Id</td>
<td>G1057-221</td>
</tr>
<tr class="odd">
<td>tran_datetime</td>
<td>Date</td>
<td>Transaction Date [Format: yyyy-mm-dd]</td>
<td>2020-03-22</td>
</tr>
<tr class="even">
<td>reference1</td>
<td>Date</td>
<td>Receipt No</td>
<td>52</td>
</tr>
<tr class="odd">
<td>reference2</td>
<td>Date</td>
<td>Guest Name</td>
<td>Holder</td>
</tr>
<tr class="even">
<td>reference3</td>
<td>String</td>
<td>Reservation No</td>
<td>35</td>
</tr>
<tr class="odd">
<td>reference4</td>
<td>String</td>
<td>Reservation No</td>
<td>35</td>
</tr>
<tr class="even">
<td>reference5</td>
<td>String</td>
<td>Folio No</td>
<td>36</td>
</tr>
<tr class="odd">
<td>reference6</td>
<td>String</td>
<td>Bill No / Invoice No</td>
<td>39</td>
</tr>
<tr class="even">
<td>reference7</td>
<td>String</td>
<td>Bill To</td>
<td>Holder</td>
</tr>
<tr class="odd">
<td>reference8</td>
<td>String</td>
<td>Arrival Date [Format: yyyy-mm-dd]</td>
<td>2020-03-24</td>
</tr>
<tr class="even">
<td>reference9</td>
<td>String</td>
<td>Departure Date [Format: yyyy-mm-dd]</td>
<td>2020-03-28</td>
</tr>
<tr class="odd">
<td>reference10</td>
<td>String</td>
<td>Business Source</td>
<td></td>
</tr>
<tr class="even">
<td>reference11</td>
<td>String</td>
<td>Travel Agent Voucher No</td>
<td></td>
</tr>
<tr class="odd">
<td>reference12</td>
<td>String</td>
<td>Market Code</td>
<td></td>
</tr>
<tr class="even">
<td>reference13</td>
<td>String</td>
<td>City Ledger Name (For only Cityledger Commision data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference14</td>
<td>String</td>
<td>Room Name</td>
<td>107</td>
</tr>
<tr class="even">
<td>reference15</td>
<td>String</td>
<td>Not Applicable</td>
<td></td>
</tr>
<tr class="odd">
<td>reference16</td>
<td>String</td>
<td>Not Applicable</td>
<td></td>
</tr>
<tr class="even">
<td>reference17</td>
<td>String</td>
<td>Identity type of billing contact. If Billing contact is guest , Company Tax ID guest will be displayed and if Billing contact is company,it will be blank.</td>
<td>Passport</td>
</tr>
<tr class="odd">
<td>reference18</td>
<td>String</td>
<td>Identity number of billing contact. If Billing contact is a guest, the tax id of guest will be displayed and if Billing contact is company,it will be blank.</td>
<td>T9305602</td>
</tr>
<tr class="even">
<td>reference19</td>
<td>String</td>
<td>Email of billing contact</td>
<td>test@gmail.com</td>
</tr>
<tr class="odd">
<td>reference20</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station,surat-396380,gujarat,india</td>
</tr>
<tr class="even">
<td>reference21</td>
<td>String</td>
<td>Telephone of billing contact</td>
<td>0261242059</td>
</tr>
<tr class="odd">
<td>detail-&gt;tran_type</td>
<td>String</td>
<td>Transaction Type<br />
(Credit/Debit)</td>
<td>Cr/Dr</td>
</tr>
<tr class="even">
<td>detail-&gt;detailId</td>
<td>Integer</td>
<td>Detail Id</td>
<td>1234500000000000971</td>
</tr>
<tr class="odd">
<td>detail-&gt;reference_id</td>
<td>integer</td>
<td></td>
<td>13</td>
</tr>
<tr class="even">
<td>detail-&gt;reference_value</td>
<td>String</td>
<td>Transaction Mode</td>
<td>Advance,Payment,<br />
Paid Out,Guest Ledger</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref1_id</td>
<td>integer</td>
<td></td>
<td>1</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref1_value</td>
<td>String</td>
<td></td>
<td>1</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref2_id</td>
<td>integer</td>
<td></td>
<td>2</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref2_value</td>
<td>String</td>
<td>Guest Name, <br />
City Ledger Id (For only Cityledger Transfer,Cityledger Commision data)<br />
Expense Type Id (For only Cityledger Commision  data)</td>
<td>Holder</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref3_id</td>
<td>integer</td>
<td></td>
<td>3</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref3_value</td>
<td>String</td>
<td>Business Source Id</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref4_id</td>
<td>integer</td>
<td></td>
<td>4</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref4_value</td>
<td>String</td>
<td>Room Id</td>
<td>1234500000000000007</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref5_id</td>
<td>integer</td>
<td></td>
<td>5</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref5_value</td>
<td>String</td>
<td>Room Type Id</td>
<td>1234500000000000002</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref6_id</td>
<td>integer</td>
<td></td>
<td>6</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref6_value</td>
<td>String</td>
<td>Folio No</td>
<td>36</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref7_id</td>
<td>integer</td>
<td></td>
<td>7</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref7_value</td>
<td>String</td>
<td>Bill To</td>
<td></td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref8_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref8_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;amount</td>
<td>Decimal</td>
<td>Transaction Amount</td>
<td>18930</td>
</tr>
<tr class="even">
<td>gross_amount</td>
<td>Decimal</td>
<td>Gross Amount</td>
<td>18930</td>
</tr>
<tr class="odd">
<td>remark</td>
<td>String</td>
<td>Comment of transaction</td>
<td></td>
</tr>
</tbody>
</table>

**Success**

``` json
{
    "status": "Success",
    "data": [
        {
            "type": "Advance Deposit Transfer",
            "data": [
                {
                    "tranId": "G1057-221",
                    "tran_datetime": "2020-03-25",
                    "reference1": "59",
                    "reference2": "Holder",
                    "reference3": "35",
                    "reference4": "35",
                    "reference5": "36",
                    "reference6": "39",
                    "reference7": "",
                    "reference8": "2020-03-25",
                    "reference9": "2020-03-27",
                    "reference10": "",
                    "reference11": "",
                    "reference12": "",
                    "reference13": "",
                    "reference14": "107",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station ,surat-396380,gujarat,india",
                    "reference21": "0261242059",
        "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000971",
                            "reference_id": 13,
                            "reference_value": "Advance",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 0,
                            "sub_ref2_value": 0,
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 18930
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000971",
                            "reference_id": 8,
                            "reference_value": "Guest Ledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "Holder",
                            "sub_ref3_id": 3,
                            "sub_ref3_value": "",
                            "sub_ref4_id": 4,
                            "sub_ref4_value": "1234500000000000007",
                            "sub_ref5_id": 5,
                            "sub_ref5_value": "1234500000000000002",
                            "sub_ref6_id": 6,
                            "sub_ref6_value": "36",
                            "sub_ref7_id": 7,
                            "sub_ref7_value": "",
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 18930
                        }
                    ],
                    "gross_amount": 18930,
                    "remark": ""
                }
            ]
        },
        {
            "type": "Folio Transfer",
            "data": [{
                           "tranId": "123456",
                           "tran_datetime": "2020-06-06 12:10:00",
                           "reference1": "Folio_Transfer-001",
                           "reference2": "Guest/Person Name",
                           "reference3": "booking no",
                           "reference4": "reservation no",
                           "reference5": "folio no",
                           "reference6": "bill no",
                           "reference7": "Bill to Name",
                           "reference8": "Arrival Date ",
                           "reference9": "Departure Date",
                           "reference10": "Business Source Name",
                           "reference11": "Travel Agent Voucher number - OTA Booking Voucher number",
                           "reference12": "Market Name",
                           "reference13": "",
                           "reference14": "Room Name",
                           "reference15": "",
                           "reference16": "",
                           "reference17": "Guest/Person Identity type or Company Tax Id",
                           "reference18": "Guest/Person Identity number"or Tax Id",
                           "reference19": "Guest/Person or Business Sources Email",
                           "reference20": "Guest/Person or Business Sources Address",
                           "reference21": "Guest/Peron or Business Sources Telephone number",
   "detail": [
                  {
                          "tran_type": "Dr",
                          "detailId": "123456-1",
                          "reference_id": "7",
                          "reference_value": "Folio Transfer",
                          "sub_reference1_id": "1",
                          "sub_reference1_value": "1",
                          "sub_reference2_id": "0",
                          "sub_reference2_value": "0",
                          "sub_reference3_id": "0",
                          "sub_reference3_value": "0",
                          "sub_reference4_id": "0",
                          "sub_reference4_value": "0",
                          "sub_reference5_id": "0",
                          "sub_reference5_value": "0",
                          "sub_reference6_id": "0",
                          "sub_reference6_value": "0",
                          "sub_reference7_id": "0",
                          "sub_reference7_value": "0",
                          "sub_reference8_id": "0",
                          "sub_reference8_value": "0",
                          "amount": "81.000"
               },
              {
                         "tran_type": "Cr",
                         "detailId": "123456-1",
                         "reference_id": "8",
                         "reference_value": "Guest Ledger",
                         "sub_reference1_id": "1",
                         "sub_reference1_value": "1",
                         "sub_reference2_id": "2",
                         "sub_reference2_value": "Guest Name",
                         "sub_reference3_id": "3",
                         "sub_reference3_value": "buss01",
                         "sub_reference4_id": "4", 
                         "sub_reference4_value": "roomunkid",
                         "sub_reference5_id": "5",
                         "sub_reference5_value": "roomtypeunkid",
                         "sub_reference6_id": "6",   
                         "sub_reference6_value": "fn-001",
                         "sub_reference7_id": "7",
                         "sub_reference7_value": "Bill to Name",
                         "sub_reference8_id": "0",
                         "sub_reference8_value": "0",
                         "amount": "81.000"
                   }
                 ],
                         "gross_amount": "81.0000",
                         "remark": ""
                 } 
             ]
        },
        {
            "type": "Cityledger Transfer",
            "data": [
                {
                    "tranId": "G1056-251",
                    "tran_datetime": "2020-03-25",
                    "reference1": "0",
                    "reference2": "Krey",
                    "reference3": "",
                    "reference4": "",
                    "reference5": "31",
                    "reference6": "33",
                    "reference7": "",
                    "reference8": "",
                    "reference9": "",
                    "reference10": "",
                    "reference11": "",
                    "reference12": "",
                    "reference13": "Booking.com Travel",
                    "reference14": "112",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station ,surat-396380,gujarat,india",
                    "reference21": "0261242059",
                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000001056",
                            "reference_id": 10,
                            "reference_value": "City Ledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000097",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 4130
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000001056",
                            "reference_id": 8,
                            "reference_value": "Guest Ledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "Krey",
                            "sub_ref3_id": 3,
                            "sub_ref3_value": "",
                            "sub_ref4_id": 4,
                            "sub_ref4_value": "1234500000000000012",
                            "sub_ref5_id": 5,
                            "sub_ref5_value": "1234500000000000002",
                            "sub_ref6_id": 6,
                            "sub_ref6_value": "31",
                            "sub_ref7_id": 7,
                            "sub_ref7_value": "",
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 4130
                        }
                    ],
                    "gross_amount": 4130,
                    "remark": ""
                }                
            ]
        },
        {
            "type": "Cityledger Commision",
            "data": [
                {
                    "tranId": "G1081-281",
                    "tran_datetime": "2020-03-28",
                    "reference1": "",
                    "reference2": "Prince",
                    "reference3": "49",
                    "reference4": "49",
                    "reference5": "53",
                    "reference6": "44",
                    "reference7": "",
                    "reference8": "2020-03-24",
                    "reference9": "2020-03-28",
                    "reference10": "Max Travel",
                    "reference11": "",
                    "reference12": "",
                    "reference13": "Max Travel",
                    "reference14": "128",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station, surat-396380,gujarat,india",
                    "reference21": "0261242059",

                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000001081",
                            "reference_id": 16,
                            "reference_value": "Paid Out",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000001",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": "800.0000"
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000001081",
                            "reference_id": 10,
                            "reference_value": "City Ledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000018",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": "800.0000"
                        }
                    ],
                    "gross_amount": "800.0000",
                    "remark": ""
                }                
            ]
        }
    ]
}
```

**Error Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---

### FIN-09 · Retrieve Incidental Invoices

**Request\_Type:** `XERO_INCIDENTAL_INVOICE`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #1743

*Tags: Open*

This API provides incidental invoices (point of sale) information that can be used in your financial accounts. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                                  |                         |
|--------------|---------------|----------------------------------|-------------------------|
| **Name**     | **Data Type** | **Description**                  | **Example**             |
| hotel_code\* | INT(11)       | Unique Hotel code                | xxxx                    |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code       | xxxxxxxxxx              |
| fromdate     | DATE          | From date \[Format: yyyy-mm-dd\] | 2020-03-01              |
| todate       | DATE          | To date \[Format: yyyy-mm-dd\]   | 2020-03-31              |
| requestfor\* | VARCHAR(100)  | Request Type                     | XERO_INCIDENTAL_INVOICE |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "fromdate" : "2020-03-01",
  "todate" : "2020-03-30",
  "requestfor": "XERO_INCIDENTAL_INVOICE"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Response status</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data-&gt;type</td>
<td>String</td>
<td>Response type</td>
<td>Incidental Invoice</td>
</tr>
<tr class="even">
<td>tranId</td>
<td>String</td>
<td>Transaction Id</td>
<td>P837-211</td>
</tr>
<tr class="odd">
<td>tran_datetime</td>
<td>Date</td>
<td>Transaction Date</td>
<td>2020-03-22</td>
</tr>
<tr class="even">
<td>reference1</td>
<td>String</td>
<td>Guest Name/City Ledger Name</td>
<td>Jhems</td>
</tr>
<tr class="odd">
<td>reference2</td>
<td>String</td>
<td>Guest Name/City Ledger Name</td>
<td>Jhems</td>
</tr>
<tr class="even">
<td>reference3</td>
<td>String</td>
<td>Bill Number</td>
<td>2</td>
</tr>
<tr class="odd">
<td>reference4</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>reference5</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference6</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>reference7</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference8</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>reference9</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference10</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>reference11</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference12</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>reference13</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference14</td>
<td>String</td>
<td>Folio Type (CASH/CREDIT)</td>
<td>CASH / CREDIT</td>
</tr>
<tr class="even">
<td>reference15</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference16</td>
<td>String</td>
<td>Not Applicable</td>
<td></td>
</tr>
<tr class="even">
<td>reference17</td>
<td>String</td>
<td>Identity type of billing contact. If Billing contact is guest, Company Tax ID of guest will be displayed and if Billing contact is company,it will be blank.</td>
<td>Passport</td>
</tr>
<tr class="odd">
<td>reference18</td>
<td>String</td>
<td>Identity number of billing contact. If Billing contact is a guest,the tax id of guest will be displayed and if Billing contact is company,it will be blank</td>
<td>T9305602</td>
</tr>
<tr class="even">
<td>reference19</td>
<td>String</td>
<td>Email of billing contact</td>
<td>test@gmail.com</td>
</tr>
<tr class="odd">
<td>reference20</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station,surat-396380,gujarat,india</td>
</tr>
<tr class="even">
<td>reference21</td>
<td>String</td>
<td>Telephone of billing contact</td>
<td>0261242059</td>
</tr>
<tr class="odd">
<td>detail-&gt;tran_type</td>
<td>String</td>
<td>Transaction Type (<strong>Credit/Debit</strong>)</td>
<td>Cr/Dr</td>
</tr>
<tr class="even">
<td>detail-&gt;remark</td>
<td>String</td>
<td>Comment</td>
<td></td>
</tr>
<tr class="odd">
<td>detail-&gt;voucherno</td>
<td>String</td>
<td>Transaction Voucher No</td>
<td>777</td>
</tr>
<tr class="even">
<td>detail-&gt;parentid</td>
<td>integer</td>
<td>Parent Id</td>
<td>1234500000000000002</td>
</tr>
<tr class="odd">
<td>detail-&gt;taxper</td>
<td>String</td>
<td>Tax Percentage</td>
<td>15%</td>
</tr>
<tr class="even">
<td>detail-&gt;detailId</td>
<td>integer</td>
<td>Transaction Details Id</td>
<td>1234500000000000991</td>
</tr>
<tr class="odd">
<td>detail-&gt;reference_id</td>
<td>integer</td>
<td>Statically Defined Reference Id</td>
<td>2</td>
</tr>
<tr class="even">
<td>detail-&gt;reference_value</td>
<td>String</td>
<td>If <strong>reference_id is 1</strong>, thenValue of reference_value: <strong>Room Revenue</strong><br />
It means :Value of reference_id:<strong>1: Room Revenue2: Extra Charges3: Discount4: Adjustment5: Tax6: Payment Type10: City Ledger</strong></td>
<td>Payment Type, Extra Charges,Guest Ledger, Discount</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference1_id</td>
<td>integer</td>
<td>Statically Defined Sub Reference Id – 1</td>
<td>1</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference1_value</td>
<td>String</td>
<td>City Ledger/ Discount, Etc Value</td>
<td>1</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference2_id</td>
<td>integer</td>
<td>Statically Defined Sub Reference Id – 2</td>
<td>2</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference2_value</td>
<td>String</td>
<td>If Above reference value is of  <strong>Extra Charges</strong>, then <strong>Extra Charge ID</strong>.<br />
If Above reference value is of <strong>Discount</strong>, then <strong>Discount ID</strong>.</td>
<td>1234500000000000002</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference3_id</td>
<td>integer</td>
<td>If Above reference value is <strong>Room Revenue</strong>, then <strong>sub_reference3_id is 1 otherwise 0</strong>.</td>
<td>1,0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference3_value</td>
<td>String</td>
<td>If Above reference value is <strong>Room Revenue</strong>, then <strong>sub_reference3_value is 1 otherwise 0</strong>.</td>
<td>1,0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference4_id</td>
<td>integer</td>
<td>If Above reference value is <strong>Room Revenue</strong>, then <strong>sub_reference4_value is 1 otherwise 0</strong>.</td>
<td>1,0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference4_value</td>
<td>String</td>
<td>If Above reference value is <strong>Room Revenue</strong>, then <strong>sub_reference4_value is 1 otherwise 0</strong></td>
<td>1,0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference5_id</td>
<td>integer</td>
<td>If Above reference value is <strong>Room Revenue</strong>, then <strong>sub_reference5_id is 5 otherwise 0</strong>.</td>
<td>5, 0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference5_value</td>
<td>String</td>
<td>If <strong>sub_reference5_id is 5</strong>, thenValue of sub_reference5_id: <strong>1/2/3/4/5</strong><br />
It means:<strong>1: Room Charges2: Cancellation Revenue3: Day Use Charges4: Late Checkout Charges5: No Show Revenue</strong><br />
If <strong>sub_reference5_id is 5</strong>, then Value of sub_reference5_id:</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference6_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference6_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference7_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference7_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference8_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference8_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;amount</td>
<td>Decimal</td>
<td>Transaction Amount</td>
<td>50</td>
</tr>
<tr class="even">
<td>detail-&gt;slabtaxunkid</td>
<td>String</td>
<td>Slab Tax id</td>
<td>1234500000000000013_1</td>
</tr>
<tr class="odd">
<td>detail-&gt;slabtax</td>
<td>String</td>
<td>Slab tax name</td>
<td>CGST</td>
</tr>
<tr class="even">
<td>detail-&gt;slab</td>
<td>String</td>
<td>Slab range</td>
<td>1000-2499-12</td>
</tr>
<tr class="odd">
<td>gross_amount</td>
<td>Decimal</td>
<td>Gross Amount</td>
<td>50</td>
</tr>
<tr class="even">
<td>amount_paid</td>
<td>Decimal</td>
<td>Amount Paid</td>
<td>50</td>
</tr>
<tr class="odd">
<td>balance</td>
<td>Decimal</td>
<td>Account Balance</td>
<td>0</td>
</tr>
<tr class="even">
<td>remark</td>
<td>String</td>
<td>Comment of transaction</td>
<td></td>
</tr>
</tbody>
</table>

**Success**

``` json
{
    "status": "Success",
    "data": [
        {
            "type": "Incidental Invoice",
            "data": [   
  {
                    "tranId": "P837-211",
                    "tran_datetime": "2020-03-21",
                    "reference1": "Jhems",
                    "reference2": "Jhems",
                    "reference3": "2",
                    "reference4": "",
                    "reference5": "",
                    "reference6": "",
                    "reference7": "",
                    "reference8": "",
                    "reference9": "",
                    "reference10": "",
                    "reference11": "",
                    "reference12": "",
                    "reference13": "",
                    "reference14": "CASH",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Passport",
                    "reference18": "T9305602",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station, surat-396380,gujarat,india ",
                    "reference21": "0261242059",

                    "detail": [
                        {
                            "tran_type": "Dr",
                            "remark": "",
                            "voucherno": "43",
                            "parentid": "",
                            "taxper": "",
                            "detailId": "1234500000000000837",
                            "reference_id": 6,
                            "reference_value": "Payment Type",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000155",
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": 70,
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""

                        },
                        {
                            "tran_type": "Cr",
                            "remark": "",
                            "voucherno": "123",
                            "parentid": "",
                            "taxper": "",
                            "detailId": "1234500000000000836",
                            "reference_id": 2,
                            "reference_value": "Extra Charges",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000001",
                            "sub_reference3_id": 1,
                            "sub_reference3_value": 1,
                            "sub_reference4_id": 1,
                            "sub_reference4_value": 1,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": "70.0000",
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        }
                    ],
                    "gross_amount": 70,
                    "amount_paid": 70,
                    "balance": 0,
                    "remark": ""
                },            
                {
                    "tranId": "P991-221",
                    "tran_datetime": "2020-03-22",
                    "reference1": "Jiya",
                    "reference2": "Mark Travels",
                    "reference3": "12",
                    "reference4": "",
                    "reference5": "",
                    "reference6": "",
                    "reference7": "",
                    "reference8": "",
                    "reference9": "",
                    "reference10": "",
                    "reference11": "",
                    "reference12": "",
                    "reference13": "",
                    "reference14": "CREDIT",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station,surat-396380,gujarat,india",
                    "reference21": "0261242059",
                    "detail": [
                        {
                            "tran_type": "Cr",
                            "remark": "",
                            "voucherno": "777",
                            "parentid": "",
                            "taxper": "",
                            "detailId": "1234500000000000991",
                            "reference_id": 2,
                            "reference_value": "Extra Charges",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000002",
                            "sub_reference3_id": 1,
                            "sub_reference3_value": 1,
                            "sub_reference4_id": 1,
                            "sub_reference4_value": 1,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": "1000.0000",
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        },
                        {
                            "tran_type": "Cr",
                            "remark": "water",
                            "voucherno": "123-1",
                            "parentid": "",
                            "taxper": "",
                            "detailId": "1234500000000000994",
                            "reference_id": 2,
                            "reference_value": "Extra Charges",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000003",
                            "sub_reference3_id": 1,
                            "sub_reference3_value": 1,
                            "sub_reference4_id": 1,
                            "sub_reference4_value": 1,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": "500.0000",
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        },
                        {
                            "tran_type": "Dr",
                            "remark": "xyz",
                            "voucherno": "",
                            "parentid": "",
                            "taxper": "",
                            "detailId": "1234500000000000992",
                            "reference_id": 10,
                            "reference_value": "City Ledger",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000020",
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": 1000,
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        },
                        {
                            "tran_type": "Dr",
                            "remark": "",
                            "voucherno": "",
                            "parentid": "",
                            "taxper": "",
                            "detailId": "1234500000000000996",
                            "reference_id": 10,
                            "reference_value": "City Ledger",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000020",
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": 450,
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        },
                        {
                            "tran_type": "Dr",
                            "remark": "",
                            "voucherno": "",
                            "parentid": "1234500000000000994",
                            "taxper": "",
                            "detailId": "1234500000000000995",
                            "reference_id": 3,
                            "reference_value": "Discount",
                            "sub_reference1_id": 1,
                            "sub_reference1_value": 1,
                            "sub_reference2_id": 2,
                            "sub_reference2_value": "1234500000000000018",
                            "sub_reference3_id": 0,
                            "sub_reference3_value": 0,
                            "sub_reference4_id": 0,
                            "sub_reference4_value": 0,
                            "sub_reference5_id": 0,
                            "sub_reference5_value": 0,
                            "sub_reference6_id": 0,
                            "sub_reference6_value": 0,
                            "sub_reference7_id": 0,
                            "sub_reference7_value": 0,
                            "sub_reference8_id": 0,
                            "sub_reference8_value": 0,
                            "amount": 50,
                            "slabtaxunkid": "",
                            "slabtax": "",
                            "slab": ""
                        }
                    ],
                    "gross_amount": 1500,
                    "amount_paid": 1500,
                    "balance": 0,
                    "remark": ""
                }
            ]
        }
    ]
}
```

**Error Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---

### FIN-10 · Retrieve Outwards Folio wise Payments

**Request\_Type:** `XERO_GET_PAYMENT_DATA_FOLIOUNKID`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2783

*Tags: Open*

This API provides outwards payments that can be used in your financial accounts. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                                         |                                         |
|--------------|---------------|-----------------------------------------|-----------------------------------------|
| **Name**     | **Data Type** | **Description**                         | **Example**                             |
| hotel_code\* | INT(11)       | Unique Hotel code                       | xxxx                                    |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code              | xxxxxxxxxx                              |
| foliounkid\* | TEXT          | Provide foliounkid with comma separated | 8000000000000026198,8000000000000026199 |
| requestfor\* | VARCHAR(100)  | Request Type                            | XERO_GET_PAYMENT_DATA_FOLIOUNKID        |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "foliounkid" : "8000000000000026198,8000000000000026199",
  "requestfor": "XERO_GET_PAYMENT_DATA_FOLIOUNKID"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Response status</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data-&gt;type</td>
<td>String</td>
<td>Response type</td>
<td>General Expense, Advance Deposit Refund, Guest Refund, Cityledger Refund</td>
</tr>
<tr class="even">
<td>tranId</td>
<td>String</td>
<td>Transaction Id</td>
<td>P950-221</td>
</tr>
<tr class="odd">
<td>tran_datetime</td>
<td>Date</td>
<td>Transaction Date [Format: yyyy-mm-dd]</td>
<td>2020-03-22</td>
</tr>
<tr class="even">
<td>reference1</td>
<td>String</td>
<td>Bill No / Inv. No (For only General Expenses data)<br />
Receipt No (For only Advance Deposit Refund, Guest Refund, Cityledger Refund data)</td>
<td>12</td>
</tr>
<tr class="odd">
<td>reference2</td>
<td>String</td>
<td>Guest Name (For only General Expense,Advance Deposit Refund, Guest Refund data)</td>
<td>Johnson</td>
</tr>
<tr class="even">
<td>reference3</td>
<td>String</td>
<td>Reservation No (For only  Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference4</td>
<td>String</td>
<td>Reservation No (For only  Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference5</td>
<td>String</td>
<td>Folio No (For only  Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference6</td>
<td>String</td>
<td>Bill No / Invoice No</td>
<td>12</td>
</tr>
<tr class="even">
<td>reference7</td>
<td>String</td>
<td>Bill To (For only General Expense,Advance Deposit Refund, Guest Refund data)</td>
<td>Johnson</td>
</tr>
<tr class="odd">
<td>reference8</td>
<td>String</td>
<td>Arrival Date Time (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference9</td>
<td>String</td>
<td>Departure Date Time (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference10</td>
<td>String</td>
<td>Business Source Id (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference11</td>
<td>String</td>
<td>TravelAgent Voucher No (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference12</td>
<td>String</td>
<td>Market Code Id ( For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="even">
<td>reference13</td>
<td>String</td>
<td>Room Name (For only Advance Deposit Refund, Guest Refund data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference14</td>
<td>String</td>
<td>Folio Type / Settlement Type</td>
<td>CASH</td>
</tr>
<tr class="even">
<td>reference15</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="odd">
<td>reference16</td>
<td>String</td>
<td>Not Applicable</td>
<td></td>
</tr>
<tr class="even">
<td>reference17</td>
<td>String</td>
<td>Identity type of billing contact. If Billing contact is guest,Company Tax ID of guest will be displayed and if Billing contact is company,it will be blank</td>
<td>Passport</td>
</tr>
<tr class="odd">
<td>reference18</td>
<td>String</td>
<td>Identity number of billing contact. If Billing contact is a guest, the tax id of guest will be displayed and if Billing contact is company , it will be blank</td>
<td>T9305602</td>
</tr>
<tr class="even">
<td>reference19</td>
<td>String</td>
<td>Email of billing contact</td>
<td>test@gmail.com</td>
</tr>
<tr class="odd">
<td>reference20</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station surat 396380 gujarat india</td>
</tr>
<tr class="even">
<td>reference21</td>
<td>String</td>
<td>Telephone of billing contact</td>
<td>0261242059</td>
</tr>
<tr class="odd">
<td>reference22</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station</td>
</tr>
<tr class="even">
<td>reference23</td>
<td>String</td>
<td>City name of billing contact</td>
<td>surat</td>
</tr>
<tr class="odd">
<td>reference24</td>
<td>String</td>
<td>State name of billing contact</td>
<td>gujarat</td>
</tr>
<tr class="even">
<td>reference25</td>
<td>String</td>
<td>Zip code of billing contact</td>
<td>396380</td>
</tr>
<tr class="odd">
<td>reference26</td>
<td>String</td>
<td>Country name of billing contact</td>
<td>india</td>
</tr>
<tr class="even">
<td>reference27</td>
<td>String</td>
<td>GSTIN number of billing contact</td>
<td></td>
</tr>
<tr class="odd">
<td>reference28</td>
<td>String</td>
<td>Contact Type Unique Id</td>
<td>VENDOR/TRAVELAGENT</td>
</tr>
<tr class="even">
<td>reference29</td>
<td>String</td>
<td>Folio Unique Id</td>
<td>8000000000000026198</td>
</tr>
<tr class="odd">
<td>detail-&gt;tran_type</td>
<td>String</td>
<td>Transaction Type (Credit/Debit)</td>
<td>Cr/Dr</td>
</tr>
<tr class="even">
<td>detail-&gt;detailId</td>
<td>Integer</td>
<td>Detail Id</td>
<td>1234500000000000951</td>
</tr>
<tr class="odd">
<td>detail-&gt;reference_id</td>
<td>integer</td>
<td>Reference Id</td>
<td>6</td>
</tr>
<tr class="even">
<td>detail-&gt;reference_value</td>
<td>String</td>
<td>Transaction Mode</td>
<td>Advance,Payment, Paid Out</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference1_id</td>
<td>integer</td>
<td>Single Ledger Id</td>
<td>1</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference1_value</td>
<td>String</td>
<td>Single Ledger Value</td>
<td>1</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference2_id</td>
<td>integer</td>
<td></td>
<td>2</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference2_value</td>
<td>String</td>
<td>Expense Type Id, Tax Id (For Only General Expensel )<br />
City Ledger Id, Payment Id (All API) <br />
Guest Name (For Only Guest Refund in debit transaction type)</td>
<td>1234500000000000155</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference3_id</td>
<td>integer</td>
<td></td>
<td>3</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference3_value</td>
<td>String</td>
<td>Business Source Id (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference4_id</td>
<td>integer</td>
<td></td>
<td>4</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference4_value</td>
<td>String</td>
<td>Room Id (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference5_id</td>
<td>integer</td>
<td></td>
<td>5</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference5_value</td>
<td>String</td>
<td>Rate Type Id (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference6_id</td>
<td>integer</td>
<td></td>
<td>6</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference6_value</td>
<td>String</td>
<td>Folio No (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference7_id</td>
<td>integer</td>
<td></td>
<td>7</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference7_value</td>
<td>String</td>
<td>Bill To (For Only Guest Refund in debit transaction type)</td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_reference8_id</td>
<td>integer</td>
<td></td>
<td>8</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_reference8_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;amount</td>
<td>Decimal</td>
<td>Transaction Amount</td>
<td>1900.0000</td>
</tr>
<tr class="even">
<td>detail-&gt;slabtaxunkid</td>
<td>String</td>
<td>IF General Expense type found then add Slab Tax id</td>
<td>1234500000000000013_1</td>
</tr>
<tr class="odd">
<td>detail-&gt;slabtax</td>
<td>String</td>
<td>IF General Expense type found then add Slab tax name</td>
<td>CGST</td>
</tr>
<tr class="even">
<td>detail-&gt;slab</td>
<td>String</td>
<td>IF General Expense type found then add Slab range</td>
<td>1000-2499-12</td>
</tr>
<tr class="odd">
<td>gross_amount</td>
<td>Decimal</td>
<td>Gross Amount</td>
<td>0</td>
</tr>
<tr class="even">
<td>amount_paid</td>
<td>Decimal</td>
<td>Amount Paid (For Only General Expense)</td>
<td>2242</td>
</tr>
<tr class="odd">
<td>balance</td>
<td>Decimal</td>
<td>Account Balance (For Only General Expense)</td>
<td>0</td>
</tr>
<tr class="even">
<td>remark</td>
<td>String</td>
<td>Comment of transaction</td>
<td></td>
</tr>
</tbody>
</table>

**Success**

``` json
{
  "status": "Success",
  "data": [
    {
      "type": "General Expense",
      "data": [
        {
          "tranId": "P950-221",
          "tran_datetime": "2020-03-22",
          "reference1": "12",
          "reference2": "Johnson",
          "reference3": "",
          "reference4": "",
          "reference5": "",
          "reference6": "12",
          "reference7": "Johnson",
          "reference8": "",
          "reference9": "",
          "reference10": "",
          "reference11": "",
          "reference12": "",
          "reference13": "",
          "reference14": "CASH",
          "reference15": "",
          "reference16": "",
          "reference17": "Passport",
          "reference18": "T9305602",
          "reference19": "test@gmail.com",
          "reference20": "Near railway station surat 396380 gujarat india",
          "reference21": "0261242059",
          "reference22": "Near railway station surat",
          "reference23": "",
          "reference24": "",
          "reference25": "",
          "reference26": "",
          "reference27": null,
          "reference28": "",
          "reference29": "8000000000000026198",
          "detail": [
            {
              "tran_type": "Cr",
              "detailId": "1234500000000000951",
              "reference_id": 6,
              "reference_value": "Payment",
              "sub_reference1_id": 1,
              "sub_reference1_value": 1,
              "sub_reference2_id": 2,
              "sub_reference2_value": "1234500000000000155",
              "sub_reference3_id": 0,
              "sub_reference3_value": 0,
              "sub_reference4_id": 0,
              "sub_reference4_value": 0,
              "sub_reference5_id": 0,
              "sub_reference5_value": 0,
              "sub_reference6_id": 0,
              "sub_reference6_value": 0,
              "sub_reference7_id": 0,
              "sub_reference7_value": 0,
              "sub_reference8_id": 0,
              "sub_reference8_value": 0,
              "amount": 1500,
              "slabtaxunkid": "",
              "slabtax": "",
              "slab": ""
            },
            {
              "tran_type": "Dr",
              "detailId": "1234500000000000950",
              "reference_id": 16,
              "reference_value": "Paid Out",
              "sub_reference1_id": 1,
              "sub_reference1_value": 1,
              "sub_reference2_id": 2,
              "sub_reference2_value": "1234500000000000002",
              "sub_reference3_id": 0,
              "sub_reference3_value": 0,
              "sub_reference4_id": 0,
              "sub_reference4_value": 0,
              "sub_reference5_id": 0,
              "sub_reference5_value": 0,
              "sub_reference6_id": 0,
              "sub_reference6_value": 0,
              "sub_reference7_id": 0,
              "sub_reference7_value": 0,
              "sub_reference8_id": 0,
              "sub_reference8_value": 0,
              "amount": "1500.0000",
              "slabtaxunkid": "",
              "slabtax": "",
              "slab": ""
            }
          ],
          "gross_amount": 1500,
          "amount_paid": 1500,
          "balance": 0,
          "remark": ""
        }
      ]
    },
    {
      "type": "Advance Deposit Refund",
      "data": [
        {
          "tranId": "P949-221",
          "tran_datetime": "2020-03-22 00:00:00",
          "reference1": "53",
          "reference2": "Eliya",
          "reference3": "50",
          "reference4": "50",
          "reference5": "54",
          "reference6": "45",
          "reference7": "Mrs. Eliya",
          "reference8": "2020-03-24",
          "reference9": "2020-03-28",
          "reference10": "Mark Tour and Travels",
          "reference11": "",
          "reference12": "",
          "reference13": "108",
          "reference14": "",
          "reference15": "",
          "reference16": "",
          "reference17": "Company Tax ID",
          "reference18": "",
          "reference19": "test@gmail.com",
          "reference20": "Near railway station surat 396380 gujarat india",
          "reference21": "0261242059",
          "reference22": "Near railway station surat",
          "reference23": "",
          "reference24": "",
          "reference25": "",
          "reference26": "",
          "reference27": null,
          "reference28": "",
          "reference29": "8000000000000026198",
          "detail": [
            {
              "tran_type": "Dr",
              "detailId": "1234500000000000948",
              "reference_id": 13,
              "reference_value": "Advance",
              "sub_reference1_id": 1,
              "sub_reference1_value": 1,
              "sub_reference2_id": 0,
              "sub_reference2_value": 0,
              "sub_reference3_id": 0,
              "sub_reference3_value": 0,
              "sub_reference4_id": 0,
              "sub_reference4_value": 0,
              "sub_reference5_id": 0,
              "sub_reference5_value": 0,
              "sub_reference6_id": 0,
              "sub_reference6_value": 0,
              "sub_reference7_id": 0,
              "sub_reference7_value": 0,
              "sub_reference8_id": 0,
              "sub_reference8_value": 0,
              "amount": 2640
            },
            {
              "tran_type": "Cr",
              "detailId": "1234500000000000948",
              "reference_id": 6,
              "reference_value": "Payment",
              "sub_reference1_id": 1,
              "sub_reference1_value": 1,
              "sub_reference2_id": 2,
              "sub_reference2_value": "1234500000000000155",
              "sub_reference3_id": 0,
              "sub_reference3_value": 0,
              "sub_reference4_id": 0,
              "sub_reference4_value": 0,
              "sub_reference5_id": 0,
              "sub_reference5_value": 0,
              "sub_reference6_id": 0,
              "sub_reference6_value": 0,
              "sub_reference7_id": 0,
              "sub_reference7_value": 0,
              "sub_reference8_id": 0,
              "sub_reference8_value": 0,
              "amount": 2640
            }
          ],
          "gross_amount": 2640,
          "remark": ""
        }
      ]
    },
    {
      "type": "Guest Refund",
      "data": [
        {
          "tranId": "3",
          "tran_datetime": "2020-06-06 12:10:00",
          "reference1": "VOC-003",
          "reference2": "Guest/Person Name",
          "reference3": "BKN-13",
          "reference4": "RN-13",
          "reference5": "FN-13",
          "reference6": "BL-13",
          "reference7": "Bill to Name",
          "reference8": "2020-06-06",
          "reference9": "2020-06-07",
          "reference10": "Business Source Name",
          "reference11": "OTA Booking Voucher number",
          "reference12": "Market Name",
          "reference13": "103",
          "reference14": "Cash",
          "reference15": "Credit Number",
          "reference16": "",
          "reference17": "Passport",
          "reference18": "T9305602",
          "reference19": "test@gmail.com",
          "reference20": "Near railway station,surat-396380,gujarat,india",
          "reference21": "0261242059",
          "reference22": "Near railway station surat",
          "reference23": "",
          "reference24": "",
          "reference25": "",
          "reference26": "",
          "reference27": null,
          "reference28": "",
          "reference29": "8000000000000026198",
          "detail": [
            {
              "tran_type": "Dr",
              "detailId": "3-1",
              "reference_id": "8",
              "reference_value": "Guest Ledger",
              "sub_reference1_id": "1",
              "sub_reference1_value": "1",
              "sub_reference2_id": "2",
              "sub_reference2_value": "Guest Name",
              "sub_reference3_id": "3",
              "sub_reference3_value": "buss01",
              "sub_reference4_id": "4",
              "sub_reference4_value": "1234500000000000150",
              "sub_reference5_id": "5",
              "sub_reference5_value": "1234500000000000006",
              "sub_reference6_id": "6",
              "sub_reference6_value": "fn-001",
              "sub_reference7_id": "7",
              "sub_reference7_value": "Bill to Name",
              "sub_reference8_id": "0",
              "sub_reference8_value": "0",
              "amount": "1780.000"
            },
            {
              "tran_type": "Cr",
              "detailId": "3-1",
              "reference_id": "6",
              "reference_value": "Payment",
              "sub_reference1_id": "1",
              "sub_reference1_value": "1",
              "sub_reference2_id": "2",
              "sub_reference2_value": "1234500000000000156",
              "sub_reference3_id": "0",
              "sub_reference3_value": "0",
              "sub_reference4_id": "0",
              "sub_reference4_value": "0",
              "sub_reference5_id": "0",
              "sub_reference5_value": "0",
              "sub_reference6_id": "0",
              "sub_reference6_value": "0",
              "sub_reference7_id": "0",
              "sub_reference7_value": "0",
              "sub_reference8_id": "0",
              "sub_reference8_value": "0",
              "amount": "1780.000"
            }
          ],
          "gross_amount": "1780.0000",
          "remark": ""
        }
      ]
    },
    {
      "type": "Cityledger Refund",
      "data": [
        {
          "tranId": "4",
          "tran_datetime": "2020-06-06 12:10:00",
          "reference1": "VOC-004",
          "reference2": "",
          "reference3": "",
          "reference4": "",
          "reference5": "",
          "reference6": "",
          "reference7": "",
          "reference8": "",
          "reference9": "",
          "reference10": "",
          "reference11": "",
          "reference12": "",
          "reference13": "",
          "reference14": "",
          "reference15": "",
          "reference16": "",
          "reference17": "",
          "reference18": "",
          "reference19": "",
          "reference20": "",
          "reference21": "",
          "reference22": "Near railway station surat",
          "reference23": "",
          "reference24": "",
          "reference25": "",
          "reference26": "",
          "reference27": null,
          "reference28": "",
          "reference29": "8000000000000026198",
          "detail": [
            {
              "tran_type": "Dr",
              "detailId": "4-1",
              "reference_id": "10",
              "reference_value": "City Ledger",
              "sub_reference1_id": "1",
              "sub_reference1_value": "1",
              "sub_reference2_id": "2",
              "sub_reference2_value": "1234500000000000156",
              "sub_reference3_id": "0",
              "sub_reference3_value": "0",
              "sub_reference4_id": "0",
              "sub_reference4_value": "0",
              "sub_reference5_id": "0",
              "sub_reference5_value": "0",
              "sub_reference6_id": "0",
              "sub_reference6_value": "0",
              "sub_reference7_id": "0",
              "sub_reference7_value": "0",
              "sub_reference8_id": "0",
              "sub_reference8_value": "0",
              "amount": "2801.000"
            },
            {
              "tran_type": "Cr",
              "detailId": "4-1",
              "reference_id": "6",
              "reference_value": "Payment",
              "sub_reference1_id": "1",
              "sub_reference1_value": "1",
              "sub_reference2_id": "2",
              "sub_reference2_value": "1234500000000000158",
              "sub_reference3_id": "0",
              "sub_reference3_value": "0",
              "sub_reference4_id": "0",
              "sub_reference4_value": "0",
              "sub_reference5_id": "0",
              "sub_reference5_value": "0",
              "sub_reference6_id": "0",
              "sub_reference6_value": "0",
              "sub_reference7_id": "0",
              "sub_reference7_value": "0",
              "sub_reference8_id": "0",
              "sub_reference8_value": "0",
              "amount": "2801.000"
            }
          ],
          "gross_amount": "2801.0000",
          "remark": ""
        }
      ]
    }
  ]
}
```

**Error Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---

### FIN-11 · Retrieve Inwards Folio wise Payments

**Request\_Type:** `XERO_GET_RECEIPT_DATA_FOLIOUNKID`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.PMSAccountAPI`  ·  **Content-Type:** application/json  ·  **eZee ref:** #2787

*Tags: Open*

This API provides inwards payments (receipts data) that can be used in your financial accounts. The API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

[https://live.ipms247.com/index.php/page/service.PMSAccountAPI ](https://live.ipms247.com/index.php/page/service.guestdatabase)

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                                         |                                         |
|--------------|---------------|-----------------------------------------|-----------------------------------------|
| **Name**     | **Data Type** | **Description**                         | **Example**                             |
| hotel_code\* | INT(11)       | Unique Hotel code                       | xxxx                                    |
| auth_code\*  | VARCHAR(300)  | Unique Authentication code              | xxxxxxxxxx                              |
| foliounkid\* | TEXT          | Provide foliounkid with comma separated | 8000000000000026123,8000000000000026123 |
| requestfor\* | VARCHAR(100)  | Request Type                            | XERO_GET_RECEIPT_DATA_FOLIOUNKID        |

**Request **

``` json
{
  "auth_code": "XXXXXXXXXXXXXXXXXXX",
  "hotel_code": "XXXX",
  "foliounkid" : "8000000000000026123,8000000000000026123",
  "requestfor": "XERO_GET_RECEIPT_DATA_FOLIOUNKID"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>status</td>
<td>String</td>
<td>Response status</td>
<td>Success</td>
</tr>
<tr class="odd">
<td>data-&gt;type</td>
<td>String</td>
<td>Response type</td>
<td>Advance Deposit,<br />
Received From Guest, Received From Cityledger</td>
</tr>
<tr class="even">
<td>tranId</td>
<td>String</td>
<td>Transaction Id</td>
<td>R946-22</td>
</tr>
<tr class="odd">
<td>tran_datetime</td>
<td>Date</td>
<td>Transaction Date [Format: yyyy-mm-dd]</td>
<td>2020-03-22</td>
</tr>
<tr class="even">
<td>reference1</td>
<td>Date</td>
<td>Receipt No (For only Advance Deposit data)</td>
<td>52</td>
</tr>
<tr class="odd">
<td>reference2</td>
<td>Date</td>
<td>Guest Name / Cityledger Name</td>
<td>Eliza</td>
</tr>
<tr class="even">
<td>reference3</td>
<td>String</td>
<td>Reservation No (For only Advance Deposit, Received From Guest data)</td>
<td>50</td>
</tr>
<tr class="odd">
<td>reference4</td>
<td>String</td>
<td>Reservation No  (For only Advance Deposit, Received From Guest data)</td>
<td>50</td>
</tr>
<tr class="even">
<td>reference5</td>
<td>String</td>
<td>Folio No <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>54</td>
</tr>
<tr class="odd">
<td>reference6</td>
<td>String</td>
<td>Bill No / Inv. No</td>
<td>45</td>
</tr>
<tr class="even">
<td>reference7</td>
<td>String</td>
<td>Bill To  (For only Advance Deposit, Received From Guest data</td>
<td>Eliza</td>
</tr>
<tr class="odd">
<td>reference8</td>
<td>String</td>
<td>Arrival Date Time <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>2020-03-24</td>
</tr>
<tr class="even">
<td>reference9</td>
<td>String</td>
<td>Departure Date Time <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>2020-03-28</td>
</tr>
<tr class="odd">
<td>reference10</td>
<td>String</td>
<td>Travel Agent/ Business Source <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>Apex Travels</td>
</tr>
<tr class="even">
<td>reference11</td>
<td>String</td>
<td>Travel Agent Voucher No <br />
(For only Advance Deposit, Received From Guest data)</td>
<td></td>
</tr>
<tr class="odd">
<td>reference13</td>
<td>String</td>
<td>Room Name <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>108</td>
</tr>
<tr class="even">
<td>reference14</td>
<td>String</td>
<td>Folio Type / Settlement Type (CASH/CREDIT) <br />
(For only Advance Deposit, Received From Guest data)</td>
<td>CASH</td>
</tr>
<tr class="odd">
<td>reference15</td>
<td>String</td>
<td></td>
<td></td>
</tr>
<tr class="even">
<td>reference16</td>
<td>String</td>
<td>Not Applicable</td>
<td></td>
</tr>
<tr class="odd">
<td>reference17</td>
<td>String</td>
<td>Identity type of billing contact.If Billing contact is guest,Company tax ID of guest will be displayed and if Billing contact is company, it will be blank</td>
<td>Passport</td>
</tr>
<tr class="even">
<td>reference18</td>
<td>String</td>
<td>Identity number of billing contact.If Billing contact is a guest,the tax id of guest will be displayed and if Billing contact is company ,it will be blank</td>
<td>T9305602</td>
</tr>
<tr class="odd">
<td>reference19</td>
<td>String</td>
<td>Email of billing contact</td>
<td>test@gmail.com</td>
</tr>
<tr class="even">
<td>reference20</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station, Surat – 396380, Gujarat, India</td>
</tr>
<tr class="odd">
<td>reference21</td>
<td>String</td>
<td>Telephone of billing contact</td>
<td>0261242059</td>
</tr>
<tr class="even">
<td>reference22</td>
<td>String</td>
<td>Address of billing contact</td>
<td>Near railway station</td>
</tr>
<tr class="odd">
<td>reference23</td>
<td>String</td>
<td>City name of billing contact</td>
<td>Surat</td>
</tr>
<tr class="even">
<td>reference24</td>
<td>String</td>
<td>State name of billing contact</td>
<td>Gujarat</td>
</tr>
<tr class="odd">
<td>reference25</td>
<td>String</td>
<td>Zip code</td>
<td>396380</td>
</tr>
<tr class="even">
<td>reference26</td>
<td>String</td>
<td>Country of billing contact</td>
<td>India</td>
</tr>
<tr class="odd">
<td>reference27</td>
<td>String</td>
<td>GSTIN Number</td>
<td></td>
</tr>
<tr class="even">
<td>reference28</td>
<td>Integer</td>
<td>Contact Type Unique Id</td>
<td>VENDOR/TRAVELAGENT</td>
</tr>
<tr class="odd">
<td>reference29</td>
<td>Integer</td>
<td>Folio Unique Id</td>
<td>1234500000000000123</td>
</tr>
<tr class="even">
<td>detail-&gt;tran_type</td>
<td>String</td>
<td>Transaction Type (Credit/Debit)</td>
<td>Cr/Dr</td>
</tr>
<tr class="odd">
<td>detail-&gt;detailId</td>
<td>Integer</td>
<td>Detail Id</td>
<td>1234500000000000946</td>
</tr>
<tr class="even">
<td>detail-&gt;reference_id</td>
<td>integer</td>
<td></td>
<td>6</td>
</tr>
<tr class="odd">
<td>detail-&gt;reference_value</td>
<td>String</td>
<td>Transaction Mode</td>
<td>Advance,Payment,<br />
Paid Out</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref1_id</td>
<td>integer</td>
<td></td>
<td>1</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref1_value</td>
<td>String</td>
<td></td>
<td>1</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref2_id</td>
<td>integer</td>
<td></td>
<td>2</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref2_value</td>
<td>String</td>
<td>City Ledger Contact Id, Payment Id<br />
Guest Name<br />
(For only Received From Guest in Credit transaction type data)</td>
<td>1234500000000000155</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref3_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref3_value</td>
<td>String</td>
<td>Business Source Id<br />
(For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref4_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref4_value</td>
<td>String</td>
<td>Room Id  (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref5_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref5_value</td>
<td>String</td>
<td>Room Type Id  (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref6_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref6_value</td>
<td>String</td>
<td>Folio No  (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref7_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref7_value</td>
<td>String</td>
<td>Bill To (For only Received From Guest in Credit transaction type data)</td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;sub_ref8_id</td>
<td>integer</td>
<td></td>
<td>0</td>
</tr>
<tr class="odd">
<td>detail-&gt;sub_ref8_value</td>
<td>String</td>
<td></td>
<td>0</td>
</tr>
<tr class="even">
<td>detail-&gt;amount</td>
<td>Decimal</td>
<td>Transaction Amount</td>
<td>200</td>
</tr>
<tr class="odd">
<td>gross_amount</td>
<td>Decimal</td>
<td>Gross Amount</td>
<td>200</td>
</tr>
<tr class="even">
<td>remark</td>
<td>String</td>
<td>Comment of transaction</td>
<td></td>
</tr>
</tbody>
</table>

**Success**

``` json
{
    "status": "Success",
    "data": [
        {
            "type": "Advance Deposit",
            "data": [
                {
                    "tranId": "R946-22",
                    "tran_datetime": "2020-03-22",
                    "reference1": "52",
                    "reference2": "Eliza,
                    "reference3": "50",
                    "reference4": "50",
                    "reference5": "54",
                    "reference6": "45",
                    "reference7": "Eliza",
                    "reference8": "2020-03-24",
                    "reference9": "2020-03-28",
                    "reference10": "Apex Travels",
                    "reference11": "",
                    "reference13": "108",
                    "reference14": "Cash",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",  
                    "reference18": "", 
                    "reference19": "test@gmail.com", 
                    "reference20": "Near railway station,surat-396380,gujarat, india", 
                    "reference21": "026142059",
                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000946",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000155",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": "25000.0000"
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000946",
                            "reference_id": 13,
                            "reference_value": "Advance",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 0,
                            "sub_ref2_value": 0,
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": "25000.0000"
                        }
                    ],
                    "gross_amount": "25000.0000",
                    "remark": ""
                }
            ]
        },
        {
            "type": "Received From Guest",
            "data": [
                {
                    "tranId": "R355-21",
                    "tran_datetime": "2020-03-21",
                    "reference1": "39",
                    "reference2": "Loy",
                    "reference3": "42",
                    "reference4": "42",
                    "reference5": "45",
                    "reference6": "20",
                    "reference7": "Loy",
                    "reference8": "2020-03-19",
                    "reference9": "2020-03-21",
                    "reference10": "Apex Travels",
                    "reference11": "",
                    "reference13": "113",
                    "reference14": "Cash",
                    "reference15": "",
                    "reference16": "", 
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station, surat-396380,gujarat,india",
                    "reference21": "026142059",
                    "reference22": "Near railway station",
                    "reference23": "Surat",
                    "reference24": "Gujarat",
                    "reference25": "396380",
                    "reference26": "India",
                    "reference27": "",
                    "reference28": "VENDOR/TRAVELAGENT",
                    "reference29": "1234500000000000123",
                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000355",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000155",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 8310
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000355",
                            "reference_id": 8,
                            "reference_value": "Guest Ledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "Loy",
                            "sub_ref3_id": 3,
                            "sub_ref3_value": "1234500000000000010",
                            "sub_ref4_id": 4,
                            "sub_ref4_value": "1234500000000000013",
                            "sub_ref5_id": 5,
                            "sub_ref5_value": "1234500000000000002",
                            "sub_ref6_id": 6,
                            "sub_ref6_value": "45",
                            "sub_ref7_id": 7,
                            "sub_ref7_value": "Loy",
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 8310
                        }
                    ],
                    "gross_amount": 8310,
                    "remark": ""
                }
            ]
        },
        {
            "type": "Received From Cityledger",
            "data": [
                {
                    "tranId": "R363-21",
                    "tran_datetime": "2020-03-21",
                    "reference1": "42",
                    "reference2": "Apex Travels",
                    "reference3": "",
                    "reference4": "",
                    "reference5": "",
                    "reference6": "",
                    "reference7": "",
                    "reference8": "",
                    "reference9": "",
                    "reference10": "",
                    "reference11": "",
                    "reference13": "",
                    "reference14": "",
                    "reference15": "",
                    "reference16": "",
                    "reference17": "Company Tax ID",
                    "reference18": "",
                    "reference19": "test@gmail.com",
                    "reference20": "Near railway station,surat-396380,gujarat,india",
                    "reference21": "0261242059",
                    "reference22": "Near railway station",
                    "reference23": "Surat",
                    "reference24": "Gujarat",
                    "reference25": "396380",
                    "reference26": "India",
                    "reference27": "",
                    "reference28": "VENDOR/TRAVELAGENT",
                    "reference29": "1234500000000000123",

                    "detail": [
                        {
                            "tran_type": "Dr",
                            "detailId": "1234500000000000363",
                            "reference_id": 6,
                            "reference_value": "Payment",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000155",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 200
                        },
                        {
                            "tran_type": "Cr",
                            "detailId": "1234500000000000363",
                            "reference_id": 10,
                            "reference_value": "Cityledger",
                            "sub_ref1_id": 1,
                            "sub_ref1_value": 1,
                            "sub_ref2_id": 2,
                            "sub_ref2_value": "1234500000000000020",
                            "sub_ref3_id": 0,
                            "sub_ref3_value": 0,
                            "sub_ref4_id": 0,
                            "sub_ref4_value": 0,
                            "sub_ref5_id": 0,
                            "sub_ref5_value": 0,
                            "sub_ref6_id": 0,
                            "sub_ref6_value": 0,
                            "sub_ref7_id": 0,
                            "sub_ref7_value": 0,
                            "sub_ref8_id": 0,
                            "sub_ref8_value": 0,
                            "amount": 200
                        }
                    ],
                    "gross_amount": 200,
                    "remark": ""
                }
            ]
        }
    ]
}
```

**Error Codes**

|           |                                                                                      |
|-----------|--------------------------------------------------------------------------------------|
| **Code**  | **Message**                                                                          |
| AllFields | All fields are mandatory.                                                            |
| AuthKey   | Authentication Key Is Not Found.                                                     |
| ReqFor    | Invalid Request Format.                                                              |
| HotelCode | Hotel Code Is Not Found                                                              |
| Error     | Something went wrong!                                                                |
| Error     | Bad Request                                                                          |
| 304       | Database Error                                                                       |
| 202       | Unauthorized request. Hotel code is not active                                       |
| 301       | Unauthorized request. Request is not valid for this hotel code \[Permission denied\] |
| 303       | Auth Code is inactive.                                                               |

---



<!-- ====================================================================== -->


# OTA / RMS

> eZee / YCS Connectivity API — `OTA` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

OTA/RMS

**9 endpoints in this file:** OTA-01 Request Room Information, OTA-02 Push Inventory, OTA-03 Push Linear Rates (Room Base Rates), OTA-04 Push Non-Linear Rates (Occupancy Base rates), OTA-05 Push Minimum Nights, OTA-06 Push Stop Sell, OTA-07 Push Close On Arrival, OTA-08 Push Close on Departure, OTA-09 Get Bookings to YCS

---

### OTA-01 · Request Room Information

**Method:** POST  ·  **eZee ref:** #1820

*Tags: OTA Connectivity, RMS*

With this API, we will be requesting rate plan mappings from the OTA/RMS. We will be calling their end point to have their data in our system. The request and response will be placed in XML format.

This mechanism is basically used to store your room configurations at our end and create the connectivity to the communication platform between YCS and the OTA/RMS.The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

|             |              |                            |            |
|-------------|--------------|----------------------------|------------|
| Name        | Type         | Description                | Example    |
| HotelCode\* | INT(11)      | Unique Hotel code          | xxxx       |
| AuthCode\*  | VARCHAR(300) | Unique Authentication code | xxxxxxxxxx |

**Request**

``` xml
<RES_Request>
    <Request_Type>RoomInfo</Request_Type>
    <Authentication>
        <HotelCode>XXXX</HotelCode>
        <AuthCode>XXXXXXXXXXXXX</AuthCode>
    </Authentication>
</RES_Request>
```

**Response**

|                     |                     |                           |                                       |
|---------------------|---------------------|---------------------------|---------------------------------------|
| **Name**            | **Type**            | **Description**           | **Example**                           |
| RoomTypeID          | INT(20)/VARCHAR(20) | Unique Room Type ID       | 123400000000000001                    |
| RoomType            | VARCHAR(1000)       | Room Type Name            | Garden View Studio Room               |
| RateTypeID          | INT(20)/VARCHAR(20) | Unique Rate Type ID       | 123400000000000001                    |
| RateType            | VARCHAR(1000)       | Rate Type Name            | European Plan                         |
| Errors.ErrorCode    |                     | Response Error Code       | 301, 404 etc                          |
| Errors.ErrorMessage |                     | Generate Response Message | Success, Unauthorized Request Message |

****Response****

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
<RoomInfo>
    <RatePlans>
        <RatePlan>
            <RoomTypeID>123400000000000001</RoomTypeID>
            <RoomType>Garden View Studio Room</RoomType>
            <RateTypeID>123400000000000001</RateTypeID>
            <RateType>European Plan</RateType>
        </RatePlan>
        <RatePlan>
            <RoomTypeID>123400000000000001</RoomTypeID>
            <RoomType>Garden View Studio Room</RoomType>
            <RateTypeID>123400000000000002</RateTypeID>
            <RateType>Non-Refundable</RateType>
        </RatePlan>
    </RatePlans>
</RoomInfo>
<Errors>
    <ErrorCode>0</ErrorCode>
    <ErrorMessage>Success</ErrorMessage>
</Errors>
</RES_Response>
 
```

**Error Codes**

|          |                                                                     |
|----------|---------------------------------------------------------------------|
| **Code** | **Message**                                                         |
| 405      | Request Parsing Error                                               |
| 401      | Unauthorized request error.(Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                  |

---

### OTA-02 · Push Inventory

**Method:** POST  ·  **eZee ref:** #1830

*Tags: OTA Connectivity, RMS*

This API allows you to update inventory on OTA/RMS. YCS will be pushing inventory updates on their OTA/RMS end points. The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

|                |                     |                                                          |                    |
|----------------|---------------------|----------------------------------------------------------|--------------------|
| **Name**       | **Type**            | **Description**                                          | **Example**        |
| HotelCode\*    | INT(11)             | Unique Hotel code                                        | xxxx               |
| AuthCode\*     | VARCHAR(300)        | Unique Authentication code                               | xxxxxxxxxx         |
| RoomTypes \*   | N                   | Contains the room types details that needs to be updated |                    |
| RoomTypeID\*   | INT(20)/VARCHAR(20) | Unique RoomType ID                                       | 123400000000000001 |
| FromDate\*     | DATETIME            | Update From date \[Format: yyyy-mm-dd\]                  | 2021-03-05         |
| ToDate\*       | DATETIME            | Update To date \[Format: yyyy-mm-dd\]                    | 2021-03-09         |
| Availability\* | INT(11)             | Inventory Count                                          | 5, 10 , 50 etc     |

**Request**

``` xml
<RES_Request>
    <Request_Type>UpdateAvailability</Request_Type>
    <Authentication>
        <HotelCode>xxxx</HotelCode>
        <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <RoomTypes>
      <RoomType>
          <RoomTypeID>123400000000000001</RoomTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <Availability>10</Availability>
      </RoomType>
      <RoomType> 
          <RoomTypeID>123400000000000001</RoomTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate> 
          <Availability>5</Availability> 
      </RoomType>
    </RoomTypes>
</RES_Request>
```

**Response**

|              |          |                           |                                                   |
|--------------|----------|---------------------------|---------------------------------------------------|
| **Name**     | **Type** | **Description**           | **Example**                                       |
| SuccessMsg   | –        | Unique Response Message   | Room Inventory Successfully Updated               |
| ErrorCode    | –        | Response Error Code       | 104, 404 ,111 etc                                 |
| ErrorMessage | –        | Generate Response Message | Rate type is missing, Invalid inventory value etc |

********Success******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Success>
        <SuccessMsg>Room Inventory Successfully Updated</SuccessMsg>
    </Success>
    <Errors>
        <ErrorCode>0</ErrorCode>
        <ErrorMessage>Success</ErrorMessage>
    </Errors>
</RES_Response>
```

********Error******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Errors>
        <ErrorCode>[ErrorCode]</ErrorCode>
        <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                        |
|----------|----------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                            |
| 405      | Request Parsing Error                                                                  |
| 401      | Unauthorized request error. (Invalid rom type, Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                                     |

**Success Codes**

|          |                                     |
|----------|-------------------------------------|
| **Code** | **Message**                         |
| 0        | Room Inventory Successfully Updated |

---

### OTA-03 · Push Linear Rates (Room Base Rates)

**Method:** POST  ·  **eZee ref:** #1833

*Tags: OTA Connectivity, RMS*

This API allows you to update base rate & extra adult/child rate on RMS/OTA. Fixed price will be added for every addition of extra adults/child. 

For example, if a room has occupancy of 5 adults, base occupancy 2, base rate 1200 and extra adult rate is 500, then upto 2 adults the price will be applied as 1200 and after that 500 will be added for every extra adult like 1700 for 3 adults, 2200 for 4 adults and 2700 for 5 adults.  

The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

|                     |                     |                                         |                    |
|---------------------|---------------------|-----------------------------------------|--------------------|
| **Name**            | **Type**            | **Description**                         | **Example**        |
| HotelCode\*         | INT(11)             | Unique Hotel code                       | xxxx               |
| AuthCode\*          | VARCHAR(300)        | Unique Authentication code              | xxxxxxxxxx         |
| RoomTypeID\*        | INT(20)/VARCHAR(20) | Unique RoomType ID                      | 123400000000000001 |
| RateTypeID\*        | INT(20)/VARCHAR(20) | Unique RateType ID                      | 123400000000000001 |
| FromDate\*          | DATETIME            | Update From date \[Format: yyyy-mm-dd\] | 2021-03-05         |
| ToDate\*            | DATETIME            | Update To date \[Format: yyyy-mm-dd\]   | 2021-03-09         |
| RoomRate.Base\*     | FLOAT               | Base Rate                               | 1000, 550.25 etc   |
| RoomRate.ExtraAdult | FLOAT               | Extra Adult Rate (it is optional)       | 1000, 550.25 etc   |
| RoomRate.ExtraChild | FLOAT               | Inventory Count                         | 1000, 550.25 etc   |

**Request**

``` xml
<RES_Request>
    <Request_Type>UpdateRoomRates</Request_Type>
    <Authentication>
        <HotelCode>xxxx</HotelCode>
        <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <RateTypes>
      <RateType>
          <RoomTypeID>123400000000000001]</RoomTypeID>
          <RateTypeID>123400000000000001</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <RoomRate>
              <Base>1000, 550.25 etc</Base>
              <ExtraAdult>1000, 550.25 etc</ExtraAdult>[Optional]
              <ExtraChild>1000, 550.25 etc</ExtraChild>[Optional]
          </RoomRate>
      </RateType>
      <RateType> 
         <RoomTypeID>123400000000000001]</RoomTypeID>
         <RateTypeID>123400000000000001</RateTypeID> 
         <FromDate>2021-03-05</FromDate> 
         <ToDate>2021-03-09</ToDate>
         <RoomRate>
             <Base>1000, 550</Base> 
             <ExtraAdult>1000</ExtraAdult>[Optional]          
             <ExtraChild>1000</ExtraChild>[Optional] 
         </RoomRate> 
      </RateType>
   </RateTypes>
</RES_Request>
```

**Response**

|                     |          |                           |                                 |
|---------------------|----------|---------------------------|---------------------------------|
| **Name**            | **Type** | **Description**           | **Example**                     |
| Success.SuccessMsg  | –        | Unique Response Message   | Min Nights Successfully Updated |
| Errors.ErrorCode    | –        | Response Error Code       | 104, 404 etc                    |
| Errors.ErrorMessage | –        | Generate Response Message | Rate type is missing etc        |

********Success******** ****

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Success>
        <SuccessMsg>Room Rates Updated sucessfully.</SuccessMsg>
    </Success>
    <Errors>
        <ErrorCode>[Code]</ErrorCode>
        <ErrorMessage>[Message]</ErrorMessage>
    </Errors>
</RES_Response>
```

********Error******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Errors>
        <ErrorCode>[ErrorCode]</ErrorCode>
        <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                                   |
|----------|---------------------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                                       |
| 405      | Request Parsing Error                                                                             |
| 401      | Unauthorized request error. (Invalid rom type/ Rate Plan, Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                                                |

**Success Codes**

|          |                                  |
|----------|----------------------------------|
| **Code** | **Message**                      |
| 0        | Room Rates Updated successfully. |

---

### OTA-04 · Push Non-Linear Rates (Occupancy Base rates)

**Method:** POST  ·  **eZee ref:** #1836

*Tags: OTA Connectivity, RMS*

This API allows you to update rates according to occupancy of room on RMS/OTA, In other words, set different rates according to different no. of pax. 

For example, if a room has occupancy of 5 adults, base occupancy 2, base rate 1200, then upto 2 adults the price will be applied as 1200 and after that the price will be varied according to the rate setting for different adults like 1800 for 3 adults, 2200 for 4 adults and 2650 for 5 adults.

The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

|                           |                     |                                          |                    |
|---------------------------|---------------------|------------------------------------------|--------------------|
| **Name**                  | **Type**            | **Description**                          | **Example**        |
| HotelCode\*               | INT(11)             | Unique Hotel code                        | xxxx               |
| AuthCode\*                | VARCHAR(300)        | Unique Authentication code               | xxxxxxxxxx         |
| RoomTypeID\*              | INT(20)/VARCHAR(20) | Unique RoomType ID                       | 123400000000000001 |
| RateTypeID\*              | INT(20)/VARCHAR(20) | Unique RateType ID                       | 123400000000000001 |
| FromDate\*                | DATETIME            | Update From date \[Format: yyyy-mm-dd\]  | 2021-03-05         |
| ToDate\*                  | DATETIME            | Update To date \[Format: yyyy-mm-dd\]    | 2021-03-09         |
| RoomRate.Adult1 …Adult7\* | FLOAT               | Adult Rates(According to room occupancy) | 1000, 550.25 etc   |
| RoomRate.Child1 …Child7   | FLOAT               | Child Rates(According to room occupancy) | 1000, 550.25 etc   |

**Request**

``` xml
<RES_Request>
    <Request_Type>UpdateRoomRatesNL</Request_Type>
    <Authentication>
        <HotelCode>xxxx</HotelCode>
        <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <RateTypes>
      <RateType>
          <RoomTypeID>123400000000000001</RoomTypeID>
          <RateTypeID>123400000000000001</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <RoomRate>
            <Adult1>1000, 550.25 etc</Adult1>
            <Adult2>1000, 550.25 etc</Adult2>
            <Adult3>1000, 550.25 etc</Adult3>
            <Adult4>1000, 550.25 etc</Adult4>
            <Adult5>1000, 550.25 etc</Adult5>
            <Adult6>1000, 550.25 etc</Adult6>
            <Adult7>1000, 550.25 etc</Adult7>
            <Child1>1000, 550.25 etc</Child1>
            <Child2>1000, 550.25 etc</Child2>
            <Child3>1000, 550.25 etc</Child3>
            <Child4>1000, 550.25 etc</Child4>
            <Child5>1000, 550.25 etc</Child5>
            <Child6>1000, 550.25 etc</Child6>
            <Child7>1000, 550.25 etc</Child7>
          </RoomRate>
      </RateType>
      <RateType> 
          <RoomTypeID>123400000000000002</RoomTypeID> 
          <RateTypeID>123400000000000002</RateTypeID> 
          <FromDate>2021-03-05</FromDate> 
          <ToDate>2021-03-09</ToDate> 
          <RoomRate> 
             <Adult1>1000, 550.25 etc</Adult1>
             <Adult2>1000, 550.25 etc</Adult2>  
             <Adult3>1000, 550.25 etc</Adult3> 
             <Adult4>1000, 550.25 etc</Adult4> 
             <Adult5>1000, 550.25 etc</Adult5> 
             <Adult6>1000, 550.25 etc</Adult6>
             <Adult7>1000, 550.25 etc</Adult7> 
             <Child1>1000, 550.25 etc</Child1> 
             <Child2>1000, 550.25 etc</Child2> 
             <Child3>1000, 550.25 etc</Child3> 
             <Child4>1000, 550.25 etc</Child4> 
             <Child5>1000, 550.25 etc</Child5>
             <Child6>1000, 550.25 etc</Child6> 
             <Child7>1000, 550.25 etc</Child7> 
         </RoomRate> 
      </RateType>
    </RateTypes>
</RES_Request>
```

**Response**

|                     |          |                           |                                 |
|---------------------|----------|---------------------------|---------------------------------|
| **Name**            | **Type** | **Description**           | **Example**                     |
| Success.SuccessMsg  | –        | Unique Response Message   | Min Nights Successfully Updated |
| Errors.ErrorCode    | –        | Response Error Code       | 104, 404 etc                    |
| Errors.ErrorMessage | –        | Generate Response Message | Rate type is missing etc        |

********Success******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Success>
        <SuccessMsg>Room Inventory Successfully Updated</SuccessMsg>
    </Success>
    <Errors>
            <ErrorCode>0</ErrorCode> 
            <ErrorMessage>Success</ErrorMessage>
    </Errors>
</RES_Response>
```

********Error******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Errors>
        <ErrorCode>[ErrorCode]</ErrorCode>
        <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                                    |
|----------|----------------------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                                        |
| 405      | Request Parsing Error                                                                              |
| 401      | Unauthorized request error.  (Invalid rom type/ Rate Plan, Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                                                 |

**Success Codes**

|          |                                  |
|----------|----------------------------------|
| **Code** | **Message**                      |
| 0        | Room Rates Updated successfully. |

---

### OTA-05 · Push Minimum Nights

**Method:** POST  ·  **eZee ref:** #1839

*Tags: OTA Connectivity, RMS*

This API allows you to update minimum nights on OTA/RMS. YCS will be pushing minimum nights updates on their OTA/RMS end points. The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>RatePlan-&gt; RoomTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RoomType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
RateTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RateType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
FromDate*</td>
<td>DATETIME</td>
<td>Update From date [Format: yyyy-mm-dd]</td>
<td>2021-03-05</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
ToDate*</td>
<td>DATETIME</td>
<td>Update To date [Format: yyyy-mm-dd]</td>
<td>2021-03-09</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
MinNight*</td>
<td>INT(11)</td>
<td>MinNight oprvalue</td>
<td>2,5,10 etc</td>
</tr>
</tbody>
</table>

**Request**

``` xml
<RES_Request>
    <Request_Type>UpdateMinNights</Request_Type>
    <Authentication>
        <HotelCode>xxxx</HotelCode>
        <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <RatePlans>
      <RatePlan>
          <RoomTypeID>123400000000000001</RoomTypeID>
          <RateTypeID>123400000000000001</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <MinNight>2,5,10 etc</MinNight>
      </RatePlan>
      <RatePlan>
          <RoomTypeID>123400000000000002</RoomTypeID>
          <RateTypeID>123400000000000002</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <MinNight>2,5,10 etc</MinNight>
      </RatePlan>
    </RatePlans>
</RES_Request>
```

**Response**

|                     |          |                           |                                 |
|---------------------|----------|---------------------------|---------------------------------|
| **Name**            | **Type** | **Description**           | **Example**                     |
| Success.SuccessMsg  | –        | Unique Response Message   | Min Nights Successfully Updated |
| Errors.ErrorCode    | –        | Response Error Code       | 104, 404 etc                    |
| Errors.ErrorMessage | –        | Generate Response Message | Rate type is missing etc        |

********Success******** ****

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Success>
        <SuccessMsg>Min Nights Successfully Updated</SuccessMsg>
    </Success>
    <Errors>
            <ErrorCode>0</ErrorCode> 
            <ErrorMessage>Success</ErrorMessage>
    </Errors>
</RES_Response>
```

********Error******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Errors>
        <ErrorCode>[ErrorCode]</ErrorCode>
        <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                                    |
|----------|----------------------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                                        |
| 405      | Request Parsing Error                                                                              |
| 401      | Unauthorized request error.  (Invalid rom type/ Rate Plan, Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                                                 |

**Success Codes**

|          |                                 |
|----------|---------------------------------|
| **Code** | **Message**                     |
| 0        | Min Nights Successfully Updated |

---

### OTA-06 · Push Stop Sell

**Method:** POST  ·  **eZee ref:** #1843

*Tags: OTA Connectivity, RMS*

This API allows you to update stop sell on OTA/RMS. YCS will be pushing stop sell updates on their OTA/RMS end points. The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
RoomTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RoomType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
RateTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RateType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
FromDate*</td>
<td>DATETIME</td>
<td>Update From date [Format: yyyy-mm-dd]</td>
<td>2021-03-05</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
ToDate*</td>
<td>DATETIME</td>
<td>Update To date [Format: yyyy-mm-dd]</td>
<td>2021-03-09</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
StopSell*</td>
<td>INT(1)</td>
<td>Stopsell oprvalue [1 or 0] 1: Enable StopSell 0: Disable Stopsell</td>
<td>1 or 0</td>
</tr>
</tbody>
</table>

**Request**

``` xml
<RES_Request>
    <Request_Type>UpdateStopSell</Request_Type>
    <Authentication>
        <HotelCode>xxxx</HotelCode>
        <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <RatePlans>
      <RatePlan>
          <RoomTypeID>123400000000000001</RoomTypeID>
          <RateTypeID>123400000000000001</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <StopSell>[oprvalue]</StopSell>
      </RatePlan>
      <RatePlan>
          <RoomTypeID>123400000000000002</RoomTypeID>
          <RateTypeID>123400000000000002</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <StopSell>[oprvalue]</StopSell>
      </RatePlan>
    </RatePlans>
</RES_Request>
```

**Response**

|                     |          |                           |                               |
|---------------------|----------|---------------------------|-------------------------------|
| **Name**            | **Type** | **Description**           | **Example**                   |
| Success.SuccessMsg  | –        | Unique Response Message   | StopSell Successfully Updated |
| Errors.ErrorCode    | –        | Response Error Code       | 104, 404 etc                  |
| Errors.ErrorMessage | –        | Generate Response Message | Rate type is missing etc      |

********Success******** ****

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Success>
        <SuccessMsg>StopSell Updated Successfully.</SuccessMsg>
    </Success>
    <Errors>
           <ErrorCode>[ErrorCode]</ErrorCode>
           <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

********Error******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Errors>
        <ErrorCode>[ErrorCode]</ErrorCode>
        <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                                    |
|----------|----------------------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                                        |
| 405      | Request Parsing Error                                                                              |
| 401      | Unauthorized request error.  (Invalid rom type/ Rate Plan, Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                                                 |

**Success Codes**

|          |                               |
|----------|-------------------------------|
| **Code** | **Message**                   |
| 0        | StopSell Successfully Updated |

---

### OTA-07 · Push Close On Arrival

**Method:** POST  ·  **eZee ref:** #1848

*Tags: OTA Connectivity, RMS*

This API allows you to update close on arrival on OTA/RMS. YCS will be pushing Close On Arrival updates on their OTA/RMS end points. The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
RoomTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RoomType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
RateTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RateType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
FromDate*</td>
<td>DATETIME</td>
<td>Update From date [Format: yyyy-mm-dd]</td>
<td>2021-03-05</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
ToDate*</td>
<td>DATETIME</td>
<td>Update To date [Format: yyyy-mm-dd]</td>
<td>2021-03-09</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
COA*</td>
<td>INT(1)</td>
<td>COA oprvalue [1 or 0] 1: Enable StopSell 0: Disable Stopsell</td>
<td>1 or 0</td>
</tr>
</tbody>
</table>

**Request**

``` xml
<RES_Request>
    <Request_Type>UpdateCOA</Request_Type>
    <Authentication>
        <HotelCode>xxxx</HotelCode>
        <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <RatePlans>
      <RatePlan>
          <RoomTypeID>123400000000000001</RoomTypeID>
          <RateTypeID>123400000000000001</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <COA>[oprvalue]</COA>
      </RatePlan>
      <RatePlan>
        <RoomTypeID>123400000000000002</RoomTypeID>
        <RateTypeID>123400000000000002</RateTypeID>
        <FromDate>2021-03-05</FromDate>
        <ToDate>2021-03-09</ToDate>
        <COA>[oprvalue]</COA>
      </RatePlan>
    </RatePlans>
</RES_Request>
```

**Response**

|                     |          |                           |                          |
|---------------------|----------|---------------------------|--------------------------|
| **Name**            | **Type** | **Description**           | **Example**              |
| Success.SuccessMsg  | –        | Unique Response Message   | COA Successfully Updated |
| Errors.ErrorCode    | –        | Response Error Code       | 104, 404 etc             |
| Errors.ErrorMessage | –        | Generate Response Message | Rate type is missing etc |

********Success********

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Success>
        <SuccessMsg>COA Updated Successfully.</SuccessMsg>
    </Success>
    <Errors>
           <ErrorCode>0</ErrorCode>
           <ErrorMessage>Success</ErrorMessage>
    </Errors>
</RES_Response>
```

********Error******** ****

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Errors>
        <ErrorCode>[ErrorCode]</ErrorCode>
        <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                                    |
|----------|----------------------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                                        |
| 405      | Request Parsing Error                                                                              |
| 401      | Unauthorized request error.  (Invalid rom type/ Rate Plan, Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                                                 |

**Success Codes**

|          |                          |
|----------|--------------------------|
| **Code** | **Message**              |
| 0        | COA Successfully Updated |

---

### OTA-08 · Push Close on Departure

**Method:** POST  ·  **eZee ref:** #1857

*Tags: OTA Connectivity, RMS*

This API allows you to update close on departure on OTA/RMS. YCS will be pushing Close On Departure updates on their OTA/RMS end points. The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by OTA/RMS

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>HotelCode*</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>AuthCode*</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>xxxxxxxxxx</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
RoomTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RoomType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
RateTypeID*</td>
<td>INT(20)/VARCHAR(20)</td>
<td>Unique RateType ID</td>
<td>123400000000000001</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
FromDate*</td>
<td>DATETIME</td>
<td>Update From date [Format: yyyy-mm-dd]</td>
<td>2021-03-05</td>
</tr>
<tr class="odd">
<td>RatePlan-&gt;<br />
ToDate*</td>
<td>DATETIME</td>
<td>Update To date [Format: yyyy-mm-dd]</td>
<td>2021-03-09</td>
</tr>
<tr class="even">
<td>RatePlan-&gt;<br />
COD*</td>
<td>INT(1)</td>
<td>COD oprvalue [1 or 0] 1: Enable StopSell 0: Disable Stopsell</td>
<td>1 or 0</td>
</tr>
</tbody>
</table>

**Request**

``` xml
<RES_Request>
    <Request_Type>UpdateCOD</Request_Type>
    <Authentication>
        <HotelCode>xxxx</HotelCode>
        <AuthCode>xxxxxxxxxx</AuthCode>
    </Authentication>
    <RatePlans>
       <RatePlan>
          <RoomTypeID>123400000000000001</RoomTypeID>
          <RateTypeID>123400000000000001</RateTypeID>
          <FromDate>2021-03-05</FromDate>
          <ToDate>2021-03-09</ToDate>
          <COD>[oprvalue]</COD>
       </RatePlan>
       <RatePlan>
        <RoomTypeID>123400000000000001</RoomTypeID>
        <RateTypeID>123400000000000002</RateTypeID>
        <FromDate>2021-03-05</FromDate>
        <ToDate>2021-03-09</ToDate>
        <COD>[oprvalue]</COD>
       </RatePlan>
    </RatePlans>
</RES_Request>
```

**Response**

|                     |          |                           |                          |
|---------------------|----------|---------------------------|--------------------------|
| **Name**            | **Type** | **Description**           | **Example**              |
| Success.SuccessMsg  | –        | Unique Response Message   | COD Successfully Updated |
| Errors.ErrorCode    | –        | Response Error Code       | 104, 404 etc             |
| Errors.ErrorMessage | –        | Generate Response Message | Rate type is missing etc |

********Success******** ****

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Success>
        <SuccessMsg>COD Updated Successfully.</SuccessMsg>
    </Success>
    <Errors>
           <ErrorCode>0</ErrorCode>
           <ErrorMessage>Success</ErrorMessage>
    </Errors>
</RES_Response>
```

********Error********

``` xml
<?xml version="1.0" standalone="yes"?>
<RES_Response>
    <Errors>
        <ErrorCode>[ErrorCode]</ErrorCode>
        <ErrorMessage>[ErrorMessage]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                                    |
|----------|----------------------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                                        |
| 405      | Request Parsing Error                                                                              |
| 401      | Unauthorized request error.  (Invalid rom type/ Rate Plan, Invalid auth code or Invalid hotelcode) |
| 400      | Temporary error! Please try again.                                                                 |

**Success Codes**

|          |                          |
|----------|--------------------------|
| **Code** | **Message**              |
| 0        | COD Successfully Updated |

---

### OTA-09 · Get Bookings to YCS

**Method:** POST  ·  **eZee ref:** #1860

*Tags: OTA Connectivity, RMS*

This API allows you to push bookings to YCS. In this mechanism, YCS will provide an endpoint to OTA/RMS where they can send bookings.

This mechanism is basically used to maintain sync by pushing us latest timely updates thereby keeping our system up-to date.

The request and response will be placed in XML format. The web service responds to HTTP POST requests.

**End Point URL**: Provided by YCS

**Response**

|                                      |               |                                                                  |                                                            |
|--------------------------------------|---------------|------------------------------------------------------------------|------------------------------------------------------------|
| **Name**                             | **Type**      | **Description**                                                  | **Example**                                                |
| HotelCode                            | INT(11)       | Unique Hotel code                                                | xxxx                                                       |
| BookingID                            | VARCHAR(255)  | Unique Booking id                                                | 10125, 86436, B4525 etc                                    |
| Status                               | VARCHAR(255)  | Booking Status i.e. New, Modify, Cancel                          | New                                                        |
| Source                               | VARCHAR(1000) | Booking generated source                                         | For example Booking.com, Expedia etc.                      |
| BookingTran.\*                       | –             | Here \* denotes Credit                                           | \*Card Informations like “Code CCNo CCType” “CCExpiryDate” |
| BookingTran.RateTypeID               | INT(20)       | Unique RateType ID                                               | 123400000000000001                                         |
| BookingTran.RateType                 | VARCHAR(1000) | RateType Name                                                    | Grand Sea View Junior Suite                                |
| BookingTran.RoomTypeCode             | INT(20)       | Unique RoomType Code                                             | 123400000000000001                                         |
| BookingTran.RoomTypeName             | VARCHAR(1000) | RoomType Name                                                    | Garden View Studio Room                                    |
| BookingTran.Start                    | DATETIME      | Check-in date                                                    | 2021-03-05 \[format : yyyy-mm-dd\]                         |
| BookingTran.End                      | DATETIME      | Check-out date                                                   | 2021-03-05 \[format : yyyy-mm-dd\]                         |
| BookingTran.TotalRate                | DECIMAL(19,4) | Rate on room in amount                                           | 1500.43                                                    |
| BookingTran.TotalDiscount            | DECIMAL(19,4) | Discount on room in                                              |                                                            |
| BookingTran.TotalExtraCharge         | DECIMAL(19,4) | Extra charges in amount                                          |                                                            |
| BookingTran.TotalTax                 | DECIMAL(19,4) | Total Tax amount                                                 |                                                            |
| BookingTran.TotalPayment             | DECIMAL(19,4) | Payment for room in                                              | 2500.54                                                    |
| BookingTran.Vehicle                  | VARCHAR(255)  | Detail of vehicle                                                |                                                            |
| BookingTran.PickupDate               | DATETIME      | Pickup date                                                      | 2021-03-05 etc                                             |
| BookingTran.PickupTime               | DATETIME      | Pickup time                                                      |                                                            |
| BookingTran.Comment                  | VARCHAR(1000) | Additional Information or comment                                |                                                            |
| BookingTran.RentalInfo.EffectiveDate | DATETIME      | Date for which the given details in the same block are effective | 2021-03-05 etc effectiveDate particular effective date     |
| BookingTran.RentalInfo.Adult         | INT(11)       | No. of Adults                                                    |                                                            |
| BookingTran.RentalInfo.Child         | INT(11)       | No. of Childs                                                    |                                                            |
| BookingTran.RentalInfo.Rent          | DECIMAL(19,4) | Room rental amount                                               |                                                            |
| BookingTran.ExtraCharge              | DECIMAL(19,4) | Extra charges in amount                                          |                                                            |
| BookingTran.RentalInfo.Tax           | DECIMAL(19,4) | Tax on Room rental amount                                        |                                                            |
| BookingTran.RentalInfo.Discount      | DECIMAL(19,4) | Discount on rental room in                                       |                                                            |

**********Sample Booking XML for Single Room Booking**********

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Reservations>
        <Reservation>
            <HotelCode>xxxx</HotelCode>
            <BookingID>7002016070604</BookingID>
            <Status>New</Status>
            <Source>Test</Source>
            <Code></Code> 
            <CCNo></CCNo>
            <CCType></CCType>
            <CCExpiryDate></CCExpiryDate>
            <CardHoldersName></CardHoldersName>
            <BookingTran>
                <SubBookingId>1</SubBookingId>
                <RateTypeID>1234000000000008</RateTypeID>
                <RateType>Deluxe single</RateType>
                <RoomTypeCode>1234000000000001</RoomTypeCode>
                <RoomTypeName>Deluxe</RoomTypeName>
                <Start>2021-03-05</Start> 
                <End>2021-03-07</End> 
                <TotalRate>1000.00</TotalRate>
                <TotalDiscount>0.00</TotalDiscount>
                <TotalExtraCharge>0.00</TotalExtraCharge>
                <TotalTax>0.00</TotalTax>
                <TotalPayment>0.00</TotalPayment>
                <Salutation>Ms</Salutation>
                <FirstName>test</FirstName>
                <LastName>name</LastName>
                <Gender>Male</Gender>
                <Address></Address>
                <City>Goa</City>
                <State></State>
                <Country></Country>
                <Zipcode>403604</Zipcode>
                <Phone>123456</Phone>
                <Mobile>+91 1234567890</Mobile>
                <Fax></Fax>
                <Email>ezee@test.com</Email>
                <TransportationMode></TransportationMode>
                <Vehicle></Vehicle>
                <PickupDate></PickupDate>
                <PickupTime></PickupTime>
                <Comment>Reservation : test</Comment>
                <RentalInfo>
                    <EffectiveDate>2021-03-05</EffectiveDate>
                    <Adult>2</Adult>
                    <Child>0</Child>
                    <Rent>1000.00</Rent>
                    <ExtraCharge>0.00</ExtraCharge>
                    <Tax>1000.00</Tax>
                    <Discount>0.00</Discount>
                </RentalInfo>
            </BookingTran>
        </Reservation>
    </Reservations>
</RES_Response>
```

****Sample Booking XML for Multiple Rooms** in a Single Booking** \[Group of rooms in the same booking\]

If you want to send multiple rooms with a single booking then you have to send a separate for each room in the booking XML with different SubBookingId id.

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Reservations>
        <Reservation>
            <HotelCode>xxxx</HotelCode>
            <BookingID>7002016070604</BookingID>
            <Status>New</Status>
            <Source>Test</Source>
            <Code></Code> 
            <CCNo></CCNo>
            <CCType></CCType>
            <CCExpiryDate></CCExpiryDate>
            <CardHoldersName></CardHoldersName>
            <BookingTran>
                <SubBookingId>1</SubBookingId>
                <RateTypeID>1234000000000008</RateTypeID>
                <RateType>Deluxe single</RateType>
                <RoomTypeCode>1234000000000001</RoomTypeCode>
                <RoomTypeName>Deluxe</RoomTypeName>
                <Start>2021-03-05</Start> 
                <End>2021-03-07</End> 
                <TotalRate>1000.00</TotalRate>
                <TotalDiscount>0.00</TotalDiscount>
                <TotalExtraCharge>0.00</TotalExtraCharge>
                <TotalTax>0.00</TotalTax>
                <TotalPayment>0.00</TotalPayment>
                <Salutation>Ms</Salutation>
                <FirstName>test</FirstName>
                <LastName>name</LastName>
                <Gender>Male</Gender>
                <Address></Address>
                <City>Goa</City>
                <State></State>
                <Country></Country>
                <Zipcode>403604</Zipcode>
                <Phone>123456</Phone>
                <Mobile>+91 1234567890</Mobile>
                <Fax></Fax>
                <Email>ezee@test.com</Email>
                <TransportationMode></TransportationMode>
                <Vehicle></Vehicle>
                <PickupDate></PickupDate>
                <PickupTime></PickupTime>
                <Comment>Reservation : test</Comment>
                <RentalInfo>
                    <EffectiveDate>2021-03-05</EffectiveDate>
                    <Adult>2</Adult>
                    <Child>0</Child>
                    <Rent>1000.00</Rent>
                    <ExtraCharge>0.00</ExtraCharge>
                    <Tax>1000.00</Tax>
                    <Discount>0.00</Discount>
                </RentalInfo>
            </BookingTran>
            <BookingTran>
                  <SubBookingId>2</SubBookingId>
                  <RateTypeID>1234000000000008</RateTypeID>
                  <RateType>Deluxe single</RateType>
                  <RoomTypeCode>1234000000000001</RoomTypeCode>
                  <RoomTypeName>Deluxe</RoomTypeName>
                  <Start>2021-03-05</Start>
                  <End>2021-03-07</End>
                  <TotalRate>1000.00</TotalRate>
                  <TotalDiscount>0.00</TotalDiscount>
                  <TotalExtraCharge>0.00</TotalExtraCharge>
                  <TotalTax>0.00</TotalTax>
                  <TotalPayment>0.00</TotalPayment>
                  <Salutation>Ms</Salutation>
                  <FirstName>test</FirstName>
                  <LastName>name</LastName>
                  <Gender>Male</Gender>
                  <Address></Address>
                  <City>Goa</City>
                  <State></State>
                  <Country></Country>
                  <Zipcode>403604</Zipcode>
                  <Phone>123456</Phone>
                  <Mobile>+91 1234567890</Mobile>
                  <Fax></Fax>
                  <Email>ezee@test.com</Email>
                  <TransportationMode></TransportationMode>
                  <Vehicle></Vehicle>
                  <PickupDate></PickupDate>
                  <PickupTime></PickupTime>
                  <Comment>Reservation : test</Comment>
                  <RentalInfo>
                      <EffectiveDate>2021-03-05</EffectiveDate>
                      <Adult>2</Adult>
                      <Child>0</Child>
                      <Rent>1000.00</Rent>
                      <ExtraCharge>0.00</ExtraCharge>
                      <Tax>1000.00</Tax>
                     <Discount>0.00</Discount>
                 </RentalInfo>
                 </BookingTran>
        </Reservation>
    </Reservations>
</RES_Response>
```

**********Sample Booking XML for multiple reservation in single request \[ For Multiple New/Modify/Cancel Booking \]**********

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>
    <Reservations>
        <Reservation>
            <HotelCode>xxxx</HotelCode>
            <BookingID>7002016070604</BookingID>
            <Status>New</Status>
            <Source>Test</Source>
            <Code></Code> 
            <CCNo></CCNo>
            <CCType></CCType>
            <CCExpiryDate></CCExpiryDate>
            <CardHoldersName></CardHoldersName>
            <BookingTran>
                <SubBookingId>138</SubBookingId>
                <RateTypeID>1234000000000008</RateTypeID>
                <RateType>Deluxe single</RateType>
                <RoomTypeCode>1234000000000001</RoomTypeCode>
                <RoomTypeName>Grand Sea View Junior Suite</RoomTypeName>
                <Start>2021-03-05</Start> 
                <End>2021-03-06</End> 
                <TotalRate>30243.50</TotalRate>
                <TotalDiscount>0.00</TotalDiscount>
                <TotalExtraCharge>0.00</TotalExtraCharge>
                <TotalTax>0.00</TotalTax>
                <TotalPayment>0.00</TotalPayment>
                <TACommision>0.00</TACommision>
                <Salutation />
                <FirstName>Test</FirstName>
                <LastName>Test</LastName>
                <Gender>Male</Gender>
                <Address />
                <City>London</City>
                <State />
                <Country>United Kingdom</Country>
                <Zipcode />
                <Phone>+447464942724</Phone>
                <Mobile />
                <Fax />
                <Email />
                <TransportationMode />
                <Vehicle />
                <PickupDate />
                <PickupTime />
                <Comment>
Reservation : ** THIS RESERVATION HAS BEEN PRE-PAID **Guest has paid: PHP 44100.07
You have a booker that prefers communication by email ,Breakfast is included in the room rate.,
Non-Smoking
                </Comment>
                <RentalInfo>
                    <EffectiveDate>2021-03-01</EffectiveDate>
                    <Adult>2</Adult>
                    <Child>0</Child>
                    <Rent>15121.75</Rent>
                    <ExtraCharge>0.00</ExtraCharge>
                    <Tax>1000.00</Tax>
                    <Discount>0.00</Discount>
                </RentalInfo>
                <RentalInfo>
                    <EffectiveDate>2021-03-02</EffectiveDate>
                    <Adult>2</Adult>
                    <Child>0</Child>
                    <Rent>15121.75</Rent>
                    <ExtraCharge>0.00</ExtraCharge>
                    <Tax>1000.00</Tax>
                    <Discount>0.00</Discount>
                </RentalInfo>
            </BookingTran>
        </Reservation>
        <Reservation>
            <HotelCode>[Hotel Code]</HotelCode>
            <BookingID>7002016070604</BookingID>
            <Status>New</Status>
            <Source>Test</Source>
            <Code></Code> 
            <CCNo></CCNo>
            <CCType></CCType>
            <CCExpiryDate></CCExpiryDate>
            <CardHoldersName></CardHoldersName>
            <BookingTran>
                <SubBookingId>138</SubBookingId>
                <RateTypeID>1234000000000008</RateTypeID>
                <RateType>Deluxe single</RateType>
                <RoomTypeCode>123400000000000006</RoomTypeCode>
                <RoomTypeName>Grand Sea View Junior Suite</RoomTypeName>
                <Start>2021-03-05</Start> 
                <End>2021-03-06</End> 
                <TotalRate>30243.50</TotalRate>
                <TotalDiscount>0.00</TotalDiscount>
                <TotalExtraCharge>0.00</TotalExtraCharge>
                <TotalTax>0.00</TotalTax>
                <TotalPayment>0.00</TotalPayment>
                <TACommision>0.00</TACommision>
                <Salutation />
                <FirstName>Test</FirstName>
                <LastName>Test</LastName>
                <Gender>Male</Gender>
                <Address />
                <City>London</City>
                <State />
                <Country>United Kingdom</Country>
                <Zipcode />
                <Phone>+447464942724</Phone>
                <Mobile />
                <Fax />
                <Email />
                <TransportationMode />
                <Vehicle />
                <PickupDate />
                <PickupTime />
                <Comment>
Reservation : ** THIS RESERVATION HAS BEEN PRE-PAID **Guest has paid: PHP 44100.07
You have a booker that prefers communication by email ,Breakfast is included in the room rate.,
Non-Smoking
                </Comment>
                <RentalInfo>
                    <EffectiveDate>2021-03-01</EffectiveDate>
                    <Adult>2</Adult>
                    <Child>0</Child>
                    <Rent>15121.75</Rent>
                    <ExtraCharge>0.00</ExtraCharge>
                    <Tax>1000.00</Tax>
                    <Discount>0.00</Discount>
                </RentalInfo>
                <RentalInfo>
                    <EffectiveDate>2021-03-02</EffectiveDate>
                    <Adult>2</Adult>
                    <Child>0</Child>
                    <Rent>15121.75</Rent>
                    <ExtraCharge>0.00</ExtraCharge>
                    <Tax>1000.00</Tax>
                    <Discount>0.00</Discount>
                </RentalInfo>
            </BookingTran>
        </Reservation>
    </Reservations>
</RES_Response>
```

****Success****

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>    
<Success>
        <SuccessMsg>[Success Message]</SuccessMsg>
    </Success>
    <Errors>
        <ErrorCode>[Success Code]</ErrorCode>                 
        <ErrorMessage>Success</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error**

``` xml
<?xml version="1.0" encoding="UTF-8"?>
<RES_Response>  
    <Errors>
        <ErrorCode>[Error Code]</ErrorCode>                 
        <ErrorMessage>[Error Message]</ErrorMessage>
    </Errors>
</RES_Response>
```

**Error Codes**

|          |                                                                                                                                                               |
|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Code** | **Message**                                                                                                                                                   |
| -100     | Unsuccessful inserting reservation : Transaction already exists.                                                                                              |
| -400     | Unsuccessful modify reservation : Transaction is inhouse.                                                                                                     |
| -500     | Unsuccessful cancel reservation : Transaction is inhouse.                                                                                                     |
| -600     | Unsuccessful modify reservation : Transaction is already void/cancelled/noshowed.                                                                             |
| -700     | Unsuccessful cancel reservation : Transaction is already void/cancelled/noshowed.                                                                             |
| -700     | Unsuccessful cancel reservation : We have received this booking directly in cancel mode, So your channel manager account doesn’t have record of this booking. |
| -800     | No Operation : Cannot find binding Room Type or Rate Plan Ids.                                                                                                |
| -800     | Unsuccessful inserting reservation : Past Date Reservation.                                                                                                   |
| -800     | Unsuccessful modify reservation : Room is not added because of past date reservation..                                                                        |
| -900     | No Operation : We have received this booking directly in modify mode, So your channel manager account doesn’t have record of this booking.                    |
| -900     | Unsuccessful inserting reservation : Some technical issue raised while processing this booking.                                                               |
| -1000    | Unsuccessful reservation : Some error arised while processing channel booking.                                                                                |
| -1000    | Unsuccessful reservation : No reservation,blank data received.                                                                                                |
| -1000    | Unsuccessful reservation : Invalid XML data received. Effective Date/Time is not received.                                                                    |
| -1000    | Unsuccessful reservation : Some error arised while parsing channel booking XML.                                                                               |
| -1000    | Unsuccessful reservation : No inventory exists in the system for specified reservation dates that’s why Booking is not processed further.                     |
| -1000    | Unsuccessful reservation : Inventory is less than the no. of rooms booked that’s why Booking is not processed further.                                        |
| -1000    | Unsuccessful reservation : MoreThan1000daysbooking.                                                                                                           |
| -1000    | Unsuccessful reservation : Booking is Rejected by Hotel.                                                                                                      |
| -1000    | Unsuccessful reservation : ArrivalDate or DepartureDate is not valid.                                                                                         |
| -1002    | No Operation : We have received this booking directly in modify mode.                                                                                         |

**Success Codes**

|          |                                     |
|----------|-------------------------------------|
| **Code** | **Message**                         |
| 0        | Successfully inserted reservation.  |
| -300     | Successfully modified reservation.  |
| -200     | Successfully cancelled reservation. |

---



<!-- ====================================================================== -->


# F&B

> eZee / YCS Connectivity API — `FNB` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

Use the F & B API to get all data related to the restaurant menu, configuration, and transactions.

To use this APIs, you need to have **eZee Optimus**.

**7 endpoints in this file:** FNB-01 Menu, FNB-02 Orders, FNB-03 Outlet and Store Information [F&B], FNB-04 Financial Accounts [F&B], FNB-05 Sales [F&B], FNB-06 Purchases [F&B], FNB-07 API Authentication Guide

---

### FNB-01 · Menu

**Content-Type:** application/json  ·  **eZee ref:** #2653

*Tags: eZee Optimus, F & B*

This API retrieves the menu information for a specific hotel based on the provided hotel code, including outlets, categories, subcategories, and items

#### 

**End Point URL**

    https://api.ipos247.com/v1/service/menu  

**Header**

    Content-Type: application/json
    Authorization: Basic {Base64 encoded username:password}

**Parameter**

| **Name**                                    | **Data Type** | **Description**                                                                                                   |
|---------------------------------------------|---------------|-------------------------------------------------------------------------------------------------------------------|
| **hotel_code** <span class="mark">\*</span> | INT           | The unique identifier for the hotel. This is essential for retrieving relevant data.                              |
| **outlet_name**                             | String        | The name of the specific outlet within the hotel. If not provided, the query will retrieve data from all outlets. |

**Request**

``` json
{
    "hotel_code": "XXXX", // Required
    "outlet_name": "MainOutlet" // Optional
}
```

**Response**

| **Name**                       | **Data Type**      | **Description**                                                             |
|--------------------------------|--------------------|-----------------------------------------------------------------------------|
| status                         | String             | Status of the request, indicating whether it was successful.                |
| statusCode                     | Integer            | HTTP status code indicating the result of the request.                      |
| data                           | Object             | Contains all data related to outlets, categories, subcategories, and items. |
| outlets                        | Array              | Contains the list of outlets available in the hotel.                        |
| outlets.ref_id                 | Integer            | Reference ID of the outlet.                                                 |
| outlets.outlet_name            | String             | Name of the outlet.                                                         |
| categories                     | Array              | Contains the list of categories with names and reference IDs.               |
| categories.ref_id              | Integer            | Reference ID of the category.                                               |
| categories.category_name       | String             | Name of the category.                                                       |
| subcategories                  | Array              | Contains the list of subcategories with names and reference IDs.            |
| subcategories.ref_id           | Integer            | Reference ID of the subcategory.                                            |
| subcategories.subcategory_name | String             | Name of the subcategory.                                                    |
| items                          | Array              | Contains the list of items with details like name, code, and price.         |
| items.item_name                | String             | Name of the item.                                                           |
| items.item_code                | String             | Code of the item.                                                           |
| items.food_type                | String             | VEG, NONVEG, EGG                                                            |
| items.unit_price               | items. description | Price of the item.                                                          |
| items.category_ref_id          | Array of Strings   | List of reference IDs corresponding to the categories.                      |
| items.subcategory_ref_id       | Array of Strings   | List of reference IDs corresponding to the subcategories.                   |
| items.outlet_ref_id            | Array of Strings   | List of reference IDs corresponding to the outlets.                         |
| items.description              | String             | Description of the item (if any).                                           |

**Success**

``` json
{
    "status": "success",
    "statusCode": 200,
    "data": {
        "outlets": [
            {
                "outlet_name": "MainOutlet",
                "ref_id": "10000000001"
            }
        ],
        "categories": [
            {
                "category_name": "Hot Drinks",
                "ref_id": "10000000001"
            },
            {
                "category_name": "Cold Drinks",
                "ref_id": "10000000002"
            },
            {
                "category_name": "Fresh Juice",
                "ref_id": "10000000003"
            },
            {
                "category_name": "Soft Drinks",
                "ref_id": "10000000004"
            }
        ],
        "subcategories": [
            {
                "subcategory_name": "Classic",
                "ref_id": "10000000001"
            },
            {
                "subcategory_name": "Coffee",
                "ref_id": "10000000002"
            },
            {
                "subcategory_name": "Tea",
                "ref_id": "10000000003"
            },
            {
                "subcategory_name": "Other Drinks",
                "ref_id": "10000000004"
            }
        ],
        "items": [
            {
                "item_name": "Blueberry",
                "Item Code": "376",
                "Unit Price": "75.2381",
                "category_ref_id": [
                    "10000000001"
                ],
                "subcategory_ref_id": [
                    "10000000001"
                ],
                "outlet_ref_id": [
                    "10000000001"
                ],
                "description": ""
            },
            {
                "item_name": "Double Apple",
                "Item Code": "377",
                "Unit Price": "75.2381",
                "category_ref_id": [
                    "10000000001"
                ],
                "subcategory_ref_id": [
                    "10000000001"
                ],
                "outlet_ref_id": [
                    "10000000001"
                ],
                "description": ""
            }
        ]
    }
}
```

**Error**

``` json
{
    "status": "warning",
    "statusCode": 400,
    "message": "Please Enter Valid Outlet Name"
}
```

---

### FNB-02 · Orders

**Content-Type:** application/json  ·  **eZee ref:** #2686

*Tags: eZee Optimus, F & B*

This API endpoint retrieves order information from a specific hotel or outlet in the Optimus system.

#### 

**End Point URL**

    https://api.ipos247.com/v1/service/orders

**Header**

    Content-Type: application/json
    Authorization: Basic {Base64 encoded username:password}

**Parameter**

| **Name**                                          | **Data Type** | **Description**                                                                                                                                                             |
|---------------------------------------------------|---------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **hotel_code**<span class="mark">**\***</span>    | INT           | The unique identifier for the hotel. This is essential for retrieving relevant data.                                                                                        |
| ****form_date****<span class="mark">**\***</span> | Date          | Specifies the starting date for the query. The date format should be in YYYY-MM-DD                                                                                          |
| **to_date**                                       | Date          | Specifies the ending date for the query. If omitted, the system will consider the form_date as the only date for data retrieval. The date format should also be YYYY-MM-DD. |
| **outlet_name**                                   | String        | The name of the specific outlet within the hotel. If not provided, the query will retrieve data from all outlets.                                                           |

**Request**

``` json
{
    "hotel_code": "your_hotel_code", // Required
    "form_date": "2024-08-22", // Required (format: YYYY-MM-DD)
    "to_date": "2024-08-22", // Optional (format: YYYY-MM-DD)
    "outlet_name": "MainOutlet" // Optional
}
```

**Response**

| **Name**              | **Data Type** | **Description**                                                                          |
|-----------------------|---------------|------------------------------------------------------------------------------------------|
| status                | String        | Status of the request, indicating whether it was successful.                             |
| statusCode            | Integer       | HTTP status code indicating the result of the request.                                   |
| data                  | Array         | An array of order objects, each containing detailed information about individual orders. |
| outletName            | String        | The name of the outlet where the order was placed.                                       |
| orderNumber           | String        | A unique identifier for the order.                                                       |
| receiptNumber         | String        | The receipt number associated with the order.                                            |
| orderType             | String        | Type of order (e.g., Dine In, Takeaway, Delivery).                                       |
| orderDateTime         | Date Time     | Date and time when the order was placed.                                                 |
| businessSource        | String        | Source of the business (may be empty or provided depending on configuration).            |
| guestName             | String        | Name of the guest, if available.                                                         |
| guestCount            | Integer       | Number of guests associated with the order.                                              |
| employeeName          | String        | Name of the employee who handled the order.                                              |
| sessionName           | String        | Name of the session in which the order was placed (can be empty).                        |
| totalItemsAmount      | Float         | Total amount for the items ordered, before discounts, taxes, and surcharges.             |
| totalDiscountAmount   | Float         | Total discount applied to the order.                                                     |
| totalTaxAmount        | Float         | Total tax applied to the order.                                                          |
| totalTipsAmount       | Float         | Total amount of tips added to the order.                                                 |
| totalSurchargesAmount | Float         | Total surcharges applied to the order.                                                   |
| totalRoundOffAmount   | Float         | Any rounding-off adjustments made to the total amount.                                   |
| totalPaymentAmount    | Float         | Total amount paid for the order.                                                         |
| netSalesAmount        | Float         | The net sales amount after applying discounts but before taxes and other charges.        |
| grossSalesAmount      | Float         | The gross sales amount before any discounts or adjustments.                              |
| remark                | String        | Any additional remarks related to the order.                                             |
| orderPayments         | Array         | An array of payment objects detailing how the order was paid.                            |
| orderPayments.amount  | Float         | The amount paid using a specific payment method.                                         |
| orderPayments.type    | String        | The payment type (e.g., Bank, Cash, Credit Card).                                        |
| orderPayments.method  | String        | The specific payment method used (e.g., Visa, MasterCard, PayPal).                       |

**Success**

``` json
{
    "status": "success",
    "statusCode": 200,
    "data": [
        {
            "outletName": "MainOutlet",
            "orderNumber": "1",
            "receiptNumber": "9696",
            "orderType": "Dine In",
            "orderDateTime": "2024-08-22 11:51:13",
            "businessSource": "",
            "guestName": "",
            "guestCount": "1",
            "employeeName": "Analyn",
            "sessionName": "",
            "totalItemsAmount": "75.9905",
            "totalDiscountAmount": "15.8000",
            "totalTaxAmount": "3.0095",
            "totalTipsAmount": "16.8000",
            "totalSurchargesAmount": "0.0000",
            "totalRoundOffAmount": "0.0000",
            "totalPaymentAmount": "80.0000",
            "netSalesAmount": "60.1905",
            "grossSalesAmount": "75.9905",
            "remark": "",
            "orderPayments": [
                {
                    "amount": "80.0000",
                    "type": "Bank",
                    "method": "Visa"
                }
            ]
        },
        {
            "outletName": "MainOutlet",
            "orderNumber": "2",
            "receiptNumber": "9698",
            "orderType": "Dine In",
            "orderDateTime": "2024-08-22 12:06:55",
            "businessSource": "",
            "guestName": "",
            "guestCount": "2",
            "employeeName": "Manager",
            "sessionName": "",
            "totalItemsAmount": "167.3714",
            "totalDiscountAmount": "34.8000",
            "totalTaxAmount": "6.6286",
            "totalTipsAmount": "0.0000",
            "totalSurchargesAmount": "0.0000",
            "totalRoundOffAmount": "0.0000",
            "totalPaymentAmount": "139.2000",
            "netSalesAmount": "132.5714",
            "grossSalesAmount": "167.3714",
            "remark": "",
            "orderPayments": [
                {
                    "amount": "139.2000",
                    "type": "Bank",
                    "method": "Visa"
                }
            ]
        }
    ]
}
```

**Error**

``` json
{
    "status": "warning",
    "statusCode": 400,
    "message": "Please Enter Valid Outlet Name"
}
```

---

### FNB-03 · Outlet and Store Information [F&B]

**Content-Type:** application/json  ·  **eZee ref:** #2748

*Tags: eZee Optimus, F & B*

This API retrieves the list of available outlet stores, along with their unique identifiers and names.

#### 

**End Point URL**

    https://api.ipos247.com/v1/fas/get_store_name

**Header**

    Content-Type: application/json
    Authorization: Basic {Base64 encoded username:password}

**Parameter**

| Name                                       | Data Type | Description                                                                  |
|--------------------------------------------|-----------|------------------------------------------------------------------------------|
| **hotel_code**<span class="mark">\*</span> | String    | The unique code identifying the hotel for which financial data is requested. |

**Request**

``` json
{
    "hotel_code": "XXXX",
}
```

**Response**

| Field Name | Data Type | Description                                                                               |
|------------|-----------|-------------------------------------------------------------------------------------------|
| status     | String    | Indicates the success or failure of the API response.                                     |
| statusCode | Integer   | HTTP status code for the API response.                                                    |
| data       | Array     | Contains the main records of financial transactions. Each entry represents a transaction. |
| id         | String    | Unique identifier for the outlet store.                                                   |
| name       | String    | Name of the outlet store.                                                                 |

**Success**

``` json
{
    "status": "success",
    "statusCode": 200,
    "data": [
        {
            "id": "1000000000000001",
            "name": "MainOutlet"
        },
        {
            "id": "1000000000000002",
            "name": "Store Factory"
        }
    ]
}
```

**Error**

``` json
{
    "status": "warning",
    "statusCode": 400,
    "message": "Please Enter Valid Outlet Name"
}
```

---

### FNB-04 · Financial Accounts [F&B]

**Content-Type:** application/json  ·  **eZee ref:** #2708

*Tags: eZee Optimus, F & B*

This API provides detailed information about all the financial heads mapped in the Food and Beverage (FnB) domain. It supports various combinations of financial data types, allowing for the relevant combination based on specific requirements.

#### 

**End Point URL**

    https://api.ipos247.com/v1/fas/get_config_data

**Header**

    Content-Type: application/json
    Authorization: Basic {Base64 encoded username:password}

**Parameter**

| **Name**                                       | **Data Type** | **Description**                                                                      |
|------------------------------------------------|---------------|--------------------------------------------------------------------------------------|
| **hotel_code**<span class="mark">**\***</span> | INT           | The unique identifier for the hotel. This is essential for retrieving relevant data. |

**Request**

``` json
{
    "hotel_code": "your_hotel_code", // Required
}
```

**Response**

| Name                 | Data Type | Description                                                     |
|----------------------|-----------|-----------------------------------------------------------------|
| status               | String    | Indicates the status of the response.                           |
| statusCode           | Integer   | HTTP status code for the response.                              |
| data                 | Array     | List of details related to financial accounts.                  |
| headerid             | String    | Unique identifier for the header.                               |
| header               | String    | Name of the financial account header.                           |
| descriptiontypeunkid | String    | Unique identifier for the description type.                     |
| descriptiontype      | String    | Type of the description for the financial account.              |
| descriptionunkid     | String    | Unique identifier for the specific description.                 |
| description          | String    | Detailed description related to the financial account and type. |

**Reference Data**

| Header ID | Header           | Description Type Unk ID | Description Type          |
|-----------|------------------|-------------------------|---------------------------|
| 1         | POS REVENUE      | 1                       | Single Ledger             |
| 1         | POS REVENUE      | 2                       | Menu Group                |
| 1         | POS REVENUE      | 3                       | Menu Subgroup             |
| 1         | POS REVENUE      | 4                       | Menu Item Category        |
| 1         | POS REVENUE      | 6                       | Session and Category Wise |
| 2         | EXTRA CHARGE     | 1                       | Single Ledger             |
| 2         | EXTRA CHARGE     | 2                       | Extra Charge              |
| 3         | TAX              | 1                       | Single Ledger             |
| 3         | TAX              | 2                       | Tax                       |
| 4         | TIPS             | 1                       | Single Ledger             |
| 5         | ADJUSTMENT       | 1                       | Single Ledger             |
| 6         | DISCOUNT         | 1                       | Single Ledger             |
| 6         | DISCOUNT         | 2                       | Discount                  |
| 7         | ROOM POSTING     | 1                       | Single Ledger             |
| 7         | ROOM POSTING     | 2                       | Room Posting              |
| 8         | PAYMENT          | 1                       | Single Ledger             |
| 8         | PAYMENT          | 2                       | Payment Type              |
| 9         | CITY LEDGER      | 1                       | Single Ledger             |
| 9         | CITY LEDGER      | 2                       | City Ledger               |
| 17        | PURCHASE         | 1                       | Single Ledger             |
| 17        | PURCHASE         | 2                       | Store Item Category       |
| 17        | PURCHASE         | 4                       | Store Item                |
| 18        | STORE TAX        | 1                       | Single Ledger             |
| 18        | STORE TAX        | 2                       | Store Tax                 |
| 19        | VENDOR           | 1                       | Single Ledger             |
| 19        | VENDOR           | 2                       | Vendor                    |
| 20        | VENDOR – ACCOUNT | 1                       | Single Ledger             |
| 20        | VENDOR – ACCOUNT | 2                       | Vendor – Account          |
| 21        | ADJUSTMENT       | 1                       | Single Ledger             |
| 22        | ADD/LESS         | 1                       | Single Ledger             |
| 23        | DISCOUNT         | 1                       | Single Ledger             |
| 31        | VENDOR PAYMENT   | 1                       | Single Ledger             |
| 31        | VENDOR PAYMENT   | 2                       | Vendor Payment Type       |
| 32        | EXTRA CHARGE     | 1                       | Single Ledger             |
| 32        | EXTRA CHARGE     | 2                       | Extra Charge              |

**Success**

``` json
{
    "status": "success",
    "statusCode": 200,
    "data": [
        {
            "headerid": "1",
            "header": "POS REVENUE",
            "descriptiontypeunkid": "1",
            "descriptiontype": "Single Ledger",
            "descriptionunkid": "1",
            "description": "Revenue"
        },
        {
            "headerid": "1",
            "header": "POS REVENUE",
            "descriptiontypeunkid": "2",
            "descriptiontype": "Menu Group",
            "descriptionunkid": "1081060000000001",
            "description": "7Seven-Menu"
        }
    ]
}
```

**Error**

``` json
{
    "status": "warning",
    "statusCode": 400,
    "message": "Please Enter Valid Outlet Name"
}
```

---

### FNB-05 · Sales [F&B]

**Content-Type:** application/json  ·  **eZee ref:** #2720

*Tags: eZee Optimus, F & B*

This API provides detailed information about all the financial heads mapped in the Food and Beverage (FnB) domain. It supports various combinations of financial data types, allowing for the relevant combination based on specific requirements.

#### 

**End Point URL**

    https://api.ipos247.com/v1/fas/get_sales_data

**Header**

    Content-Type: application/json
    Authorization: Basic {Base64 encoded username:password}

**Parameter**

| Name                                       | Data Type | Description                                                                                |
|--------------------------------------------|-----------|--------------------------------------------------------------------------------------------|
| **hotel_code**<span class="mark">\*</span> | String    | The unique code identifying the hotel for which financial data is requested.               |
| **fromdate**<span class="mark">\*</span>   | Date      | The starting date of the financial data retrieval period (in `YYYY-MM-DD` format).         |
| **todate**<span class="mark">\*</span>     | Date      | The ending date of the financial data retrieval period (in `YYYY-MM-DD` format).           |
| **exclude_roomposting**                    | Integer   | Flag to exclude room posting details from the data \[0 = Include (default), 1 = Exclude\]. |
| **exclude_nocharge**                       | Integer   | Flag to exclude no-charge details from the data \[0 = Include (default), 1 = Exclude\].    |

**Request**

``` json
{
    "hotel_code": "XXXX",
    "fromdate": "2024-05-16",
    "todate": "2024-05-16",
    "exclude_roomposting": "0",
    "exclude_nocharge": "0"
}
```

**Response**

| Field Name | Data Type | Description                                                                               |
|------------|-----------|-------------------------------------------------------------------------------------------|
| status     | String    | Indicates the success or failure of the API response.                                     |
| statusCode | Integer   | HTTP status code for the API response.                                                    |
| data       | Array     | Contains the main records of financial transactions. Each entry represents a transaction. |

**Information about data array**

| Field Name                | Data Type | Description                                                                                                                                        |
|---------------------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| record_id                 | String    | Unique identifier for the financial record.                                                                                                        |
| record_date               | Date      | The date of the financial transaction (in YYYY-MM-DD format).                                                                                      |
| reference1                | String    | Primary reference ID for the transaction.                                                                                                          |
| reference2                | String    | Secondary reference ID for the transaction. Can be null.                                                                                           |
| reference3                | String    | Name of the store or location. Can be blank.                                                                                                       |
| reference4 to reference22 | String    | Additional references. Data may be null or blank depending on the record.                                                                          |
| gross_amount              | Decimal   | Total gross amount of the transaction.                                                                                                             |
| flat_discount             | Decimal   | Any flat discount applied to the transaction. Can be blank.                                                                                        |
| total_tax                 | Decimal   | Total tax applied to the transaction. Will be provided even if 0.                                                                                  |
| total_amount              | Decimal   | Total amount after adding taxes and discounts.                                                                                                     |
| amount_paid               | Decimal   | Amount paid for the transaction. Can be blank.                                                                                                     |
| amount_posted             | Decimal   | Amount posted for the transaction. Can be null or blank.                                                                                           |
| balance                   | Decimal   | Remaining balance for the transaction. Will be provided even if 0.                                                                                 |
| narration                 | String    | Additional narration or comments for the transaction. Can be blank.                                                                                |
| details                   | Array     | Detailed breakdown of the transaction, including items and taxes. Empty or null data fields will be provided for individual details if applicable. |

**Information about details array**

| Field Name                       | Data Type | Description                                                                    |
|----------------------------------|-----------|--------------------------------------------------------------------------------|
| detail_record_id                 | String    | Unique identifier for the detail record.                                       |
| parent_record_id                 | String    | Parent record ID, applicable for related records. Can be null.                 |
| reference_id                     | Integer   | ID representing the reference type (e.g., POS Sales, Taxes).                   |
| reference_name                   | String    | Name of the reference, such as transaction type.                               |
| tran_type                        | String    | Transaction type (e.g., Credit, Debit).                                        |
| charge_name                      | String    | Name of the charge or item in the transaction.                                 |
| amount                           | Decimal   | Amount related to the detail record.                                           |
| remark                           | String    | Additional remarks for the detail record. Can be blank or null.                |
| taxper                           | Decimal   | Tax percentage for the item or charge. Can be null or blank.                   |
| sub_ref1_value to sub_ref8_value | Various   | Sub-references for the detailed record. These values may vary and can be null. |

**Success**

``` json
{
    "status": "success",
    "statusCode": 200,
    "data": [
        {
            "record_id": "1000000000013299",
            "record_date": "2024-05-16",
            "reference1": "REC-4041",
            "reference2": "1000000000000014",
            "reference3": "McDonald's- vesu",
            "reference4": null,
            "reference5": null,
            "reference6": "1715852000",
            "reference7": "",
            "reference8": "",
            "reference9": "0",
            "reference10": "0",
            "reference11": "",
            "reference12": "",
            "reference13": "",
            "reference14": "",
            "reference15": "",
            "reference16": "",
            "reference17": "",
            "reference18": "john",
            "reference19": "",
            "reference20": "",
            "reference21": "Take Away",
            "reference22": "",
            "gross_amount": "200.0000",
            "flat_discount": "0.0000",
            "total_tax": "10.0000",
            "add_less_amount": "0.0000",
            "total_amount": "210.0000",
            "amount_paid": "0.0000",
            "amount_posted": "0.0000",
            "balance": "210.0000",
            "narration": "",
            "details": [
                {
                    "detail_record_id": "1000000000109878",
                    "reference_id": 1,
                    "reference_name": "POS Sales",
                    "tran_type": "Cr",
                    "item_code": "",
                    "charge_name": "Test2",
                    "hsn_code": "",
                    "quantity": "1.000000000000",
                    "sub_ref1_id": 1,
                    "sub_ref1_value": 1,
                    "sub_ref2_id": 2,
                    "sub_ref2_value": 0,
                    "sub_ref3_id": 3,
                    "sub_ref3_value": 0,
                    "sub_ref4_id": 4,
                    "sub_ref4_value": "1000000000000001",
                    "sub_ref5_id": 5,
                    "sub_ref5_value": 0,
                    "sub_ref6_id": 6,
                    "sub_ref6_value": "1000000000000001 + ",
                    "sub_ref7_id": 7,
                    "sub_ref7_value": "1000000000000605",
                    "sub_ref8_id": 0,
                    "sub_ref8_value": 0,
                    "amount": "100.0000",
                    "remark": ""
                },
                {
                    "detail_record_id": "1000000000109879",
                    "parent_record_id": "1000000000109878",
                    "reference_id": 3,
                    "reference_name": "Taxes",
                    "tran_type": "Cr",
                    "sub_ref1_id": 1,
                    "sub_ref1_value": 1,
                    "sub_ref2_id": 2,
                    "sub_ref2_value": "1000000000000002",
                    "sub_ref3_id": 3,
                    "sub_ref3_value": "2.5000",
                    "sub_ref4_id": 0,
                    "sub_ref4_value": 0,
                    "sub_ref5_id": 0,
                    "sub_ref5_value": 0,
                    "sub_ref6_id": 0,
                    "sub_ref6_value": 0,
                    "sub_ref7_id": 0,
                    "sub_ref7_value": 0,
                    "sub_ref8_id": 0,
                    "sub_ref8_value": 0,
                    "amount": "2.5000",
                    "taxper": "2.5000",
                    "remark": ""
                },
                {
                    "detail_record_id": "1000000000109880",
                    "parent_record_id": "1000000000109878",
                    "reference_id": 3,
                    "reference_name": "Taxes",
                    "tran_type": "Cr",
                    "sub_ref1_id": 1,
                    "sub_ref1_value": 1,
                    "sub_ref2_id": 2,
                    "sub_ref2_value": "1000000000000001",
                    "sub_ref3_id": 3,
                    "sub_ref3_value": "2.5000",
                    "sub_ref4_id": 0,
                    "sub_ref4_value": 0,
                    "sub_ref5_id": 0,
                    "sub_ref5_value": 0,
                    "sub_ref6_id": 0,
                    "sub_ref6_value": 0,
                    "sub_ref7_id": 0,
                    "sub_ref7_value": 0,
                    "sub_ref8_id": 0,
                    "sub_ref8_value": 0,
                    "amount": "2.5000",
                    "taxper": "2.5000",
                    "remark": ""
                }
            ]
        }
    ]
}
```

**Error**

``` json
{
    "status": "warning",
    "statusCode": 400,
    "message": "Please Enter Valid Outlet Name"
}
```

---

### FNB-06 · Purchases [F&B]

**Content-Type:** application/json  ·  **eZee ref:** #2759

*Tags: eZee Optimus, F & B*

This API provides detailed information about all the financial heads mapped in the Food and Beverage (FnB) domain. It supports various combinations of financial data types, allowing for the relevant combination based on specific requirements.

#### 

**End Point URL**

    https://api.ipos247.com/v1/fas/get_purchase_data

**Header**

    Content-Type: application/json
    Authorization: Basic {Base64 encoded username:password}

**Parameter**

| Name                                       | Data Type | Description                                                                        |
|--------------------------------------------|-----------|------------------------------------------------------------------------------------|
| **hotel_code**<span class="mark">\*</span> | String    | The unique code identifying the hotel for which financial data is requested.       |
| **fromdate**<span class="mark">\*</span>   | Date      | The starting date of the financial data retrieval period (in `YYYY-MM-DD` format). |
| **todate**<span class="mark">\*</span>     | Date      | The ending date of the financial data retrieval period (in `YYYY-MM-DD` format).   |
| ****outlet****                             | Integer   | The unique identifier for the outlet store                                         |

**Request**

``` json
{
    "hotel_code": "XXXX",
    "fromdate": "2024-05-28",
    "todate": "2024-06-27",
    "outlet" : "1000000000000001"
 }
 
```

**Response**

| Field Name | Data Type | Description                                                                               |
|------------|-----------|-------------------------------------------------------------------------------------------|
| status     | String    | Indicates the success or failure of the API response.                                     |
| statusCode | Integer   | HTTP status code for the API response.                                                    |
| data       | Array     | Contains the main records of financial transactions. Each entry represents a transaction. |

**Information about data array**

| Field Name                | Data Type | Description                                                                                                                                        |
|---------------------------|-----------|----------------------------------------------------------------------------------------------------------------------------------------------------|
| record_id                 | String    | Unique identifier for the financial record.                                                                                                        |
| record_date               | Date      | The date of the financial transaction (in YYYY-MM-DD format).                                                                                      |
| reference1                | String    | Primary reference ID for the transaction.                                                                                                          |
| reference2                | String    | Secondary reference ID for the transaction. Can be null.                                                                                           |
| reference3                | String    | Name of the store or location. Can be blank.                                                                                                       |
| reference4 to reference22 | String    | Additional references. Data may be null or blank depending on the record.                                                                          |
| gross_amount              | Decimal   | Total gross amount of the transaction.                                                                                                             |
| flat_discount             | Decimal   | Any flat discount applied to the transaction. Can be blank.                                                                                        |
| total_tax                 | Decimal   | Total tax applied to the transaction. Will be provided even if 0.                                                                                  |
| total_amount              | Decimal   | Total amount after adding taxes and discounts.                                                                                                     |
| amount_paid               | Decimal   | Amount paid for the transaction. Can be blank.                                                                                                     |
| amount_posted             | Decimal   | Amount posted for the transaction. Can be null or blank.                                                                                           |
| balance                   | Decimal   | Remaining balance for the transaction. Will be provided even if 0.                                                                                 |
| narration                 | String    | Additional narration or comments for the transaction. Can be blank.                                                                                |
| details                   | Array     | Detailed breakdown of the transaction, including items and taxes. Empty or null data fields will be provided for individual details if applicable. |

**Information about details array**

| Field Name                       | Data Type | Description                                                                    |
|----------------------------------|-----------|--------------------------------------------------------------------------------|
| detail_record_id                 | String    | Unique identifier for the detail record.                                       |
| parent_record_id                 | String    | Parent record ID, applicable for related records. Can be null.                 |
| reference_id                     | Integer   | ID representing the reference type (e.g., POS Sales, Taxes).                   |
| reference_name                   | String    | Name of the reference, such as transaction type.                               |
| tran_type                        | String    | Transaction type (e.g., Credit, Debit).                                        |
| charge_name                      | String    | Name of the charge or item in the transaction.                                 |
| amount                           | Decimal   | Amount related to the detail record.                                           |
| remark                           | String    | Additional remarks for the detail record. Can be blank or null.                |
| taxper                           | Decimal   | Tax percentage for the item or charge. Can be null or blank.                   |
| sub_ref1_value to sub_ref8_value | Various   | Sub-references for the detailed record. These values may vary and can be null. |

**Success**

``` json
{
    "status": "success",
    "statusCode": 200,
    "data": [
        {
            "record_id": "1000000000014622",
            "record_date": "2024-06-20",
            "reference1": "GRN-25",
            "reference2": "1021",
            "reference3": "1000000000000001",
            "reference4": "Store Name",
            "reference5": "Account 1",
            "reference6": "",
            "reference7": "",
            "reference8": "",
            "reference9": "",
            "reference10": "",
            "reference11": "",
            "reference12": "",
            "reference13": "",
            "reference14": "",
            "reference15": "Goods Received Note",
            "gross_amount": "3591.7150",
            "flat_discount": "0.0000",
            "total_tax": "1.2656",
            "add_less_amount": "0.0000",
            "total_amount": "3592.9806",
            "remark": "",
            "narration": "",
            "details": [
                {
                    "detail_reference_id": "1000000000116025",
                    "tran_type": "Dr",
                    "reference_id": 17,
                    "reference_name": "Purchase",
                    "sub_ref1_id": 1,
                    "sub_ref1_value": 1,
                    "sub_ref2_id": 2,
                    "sub_ref2_value": "1000000000000001",
                    "sub_ref3_id": 0,
                    "sub_ref3_value": 0,
                    "sub_ref4_id": 4,
                    "sub_ref4_value": "1000000000000030",
                    "sub_ref5_id": 5,
                    "sub_ref5_value": 0,
                    "amount": "5.7150",
                    "item_code": "",
                    "charge_name": "Item 1",
                    "hsn_code": "",
                    "rate_per_unit": "5.7150",
                    "qty": "1.0000",
                    "unit_unkid": "1000000000000015"
                },
                {
                    "detail_reference_id": "1000000000116026",
                    "tran_type": "Dr",
                    "reference_id": 17,
                    "reference_name": "Purchase",
                    "sub_ref1_id": 1,
                    "sub_ref1_value": 1,
                    "sub_ref2_id": 2,
                    "sub_ref2_value": "1000000000000001",
                    "sub_ref3_id": 0,
                    "sub_ref3_value": 0,
                    "sub_ref4_id": 4,
                    "sub_ref4_value": "1000000000000018",
                    "sub_ref5_id": 5,
                    "sub_ref5_value": 0,
                    "amount": "1500.0000",
                    "item_code": "",
                    "charge_name": "Item 2",
                    "hsn_code": "",
                    "rate_per_unit": "1500.0000",
                    "qty": "1.0000",
                    "unit_unkid": "1000000000000013"
                }
            ]
        }
    ]
}
```

**Error**

``` json
{
    "status": "warning",
    "statusCode": 400,
    "message": "Please Enter Valid Outlet Name"
}
```

---

### FNB-07 · API Authentication Guide

**Method:** POST  ·  **Content-Type:** application/json  ·  **eZee ref:** #2822

All F&B API requires **HTTP Basic Authentication**.  
You will be given a **username** and **password**. Use them in every API request.

**Step 1 — Credentials**

    Username: your_username_here
    Password: your_password_here

**Step 2 — Authorisation Header**

Combine username:password, encode it in Base64, and send it in the header:

    Authorization: Basic <base64(username:password)>

Example:

    Authorization: Basic dGVzdHVzZXI6bXlwYXNzd29yZDEyMw==

**Example:**

JavaScript (Fetch):

    const username = "your_username_here";
    const password = "your_password_here";
    const auth = btoa(`${username}:${password}`);

    fetch("https://api.yourdomain.com/v1/resource", {
      headers: {
        "Authorization": `Basic ${auth}`,
        "Accept": "application/json"
      }
    })
    .then(res => res.json())
    .then(console.log);

**PHP (cURL)**

``` xml
<?php
$url = "https://api.xxx.com/v1/resource";
$username = "your_username_here";
$password = "your_password_here";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Accept: application/json"
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, '{ "hotel_code": "xxxx" }');
curl_setopt($ch, CURLOPT_USERPWD, "$username:$password"); // Basic Auth

$response = curl_exec($ch);
if (curl_errno($ch)) {
    echo "Error: " . curl_error($ch);
} else {
    echo $response;
}
curl_close($ch);
?>
```

---



<!-- ====================================================================== -->


# Others

> eZee / YCS Connectivity API — `OTH` endpoints. Verbatim mirror of api.ezeetechnosys.com (pulled 5 June 2026).

Use these API’s to maintain contact profiles thereby maintaining account receivables for your properties.

**5 endpoints in this file:** OTH-01 Retrieve Guest Stays Statistics, OTH-02 Retrieve a Company, OTH-03 Retrieve A Travel Agent, OTH-04 Create a Travel Agent, OTH-05 Retrieve Guest

---

### OTH-01 · Retrieve Guest Stays Statistics

**Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/index.php/page/service.guestdatabase`  ·  **Content-Type:** application/json  ·  **eZee ref:** #808

*Tags: Open*

This API gives us the guest stays statistics by which one can accumulate the volume of returning guests thereby helping to create the best guest experience. This API can return data in CSV formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/index.php/page/service.guestdatabase>

**Header**

Content-Type: application/json

#### **Parameter**

|              |               |                            |                   |
|--------------|---------------|----------------------------|-------------------|
| **Name**     | **Data Type** | **Description**            | **Example**       |
| HotelCode \* | INT(11)       | Unique Hotel code          | XXXX              |
| AuthCode \*  | VARCHAR(300)  | Unique Authentication code | XXXXXXXXXXXXXXXXX |

**Request **

``` json
{  
    "hotel_code":"xxxx",
    "authkey" : "xxxxxxxxxxxx"
}
```

**Response**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description </strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Guest Name</td>
<td>String</td>
<td>To get a guest name</td>
<td>Daniel L</td>
</tr>
<tr class="odd">
<td>Guest Email</td>
<td>String</td>
<td>To get a guest email address</td>
<td>Daniele123@yahoo.com</td>
</tr>
<tr class="even">
<td>Total Number of stays</td>
<td>String</td>
<td>To get a guest’s total number of stay in a hotel</td>
<td>2</td>
</tr>
<tr class="odd">
<td>First stay</td>
<td>Date</td>
<td>To get a guest’s first stay</td>
<td>2020-05-02</td>
</tr>
<tr class="even">
<td>First Reservation No</td>
<td>String</td>
<td>To get a guest’s first reservation number</td>
<td>5-1</td>
</tr>
<tr class="odd">
<td>First Folio No</td>
<td>String</td>
<td>To get a guest’s first folio number</td>
<td>5</td>
</tr>
<tr class="even">
<td>Last stay</td>
<td>Date</td>
<td>To get a guest’s last stay</td>
<td>2020-05-02</td>
</tr>
<tr class="odd">
<td>Last Reservation No</td>
<td>String</td>
<td>To get a guest’s last reservation number</td>
<td>5-1</td>
</tr>
<tr class="even">
<td>Last Folio No</td>
<td>String</td>
<td>To get a guest’s last folio number</td>
<td>5</td>
</tr>
<tr class="odd">
<td>Next stay</td>
<td>Date</td>
<td>To get a guest’s next stay</td>
<td><br />
</td>
</tr>
<tr class="even">
<td>Next Reservation No</td>
<td>String</td>
<td>To get a guest’s next reservation number</td>
<td><br />
</td>
</tr>
<tr class="odd">
<td>Next Folio No</td>
<td>String</td>
<td>To get a guest’s next folio number</td>
<td><br />
</td>
</tr>
<tr class="even">
<td>Lifetime Spending</td>
<td>String</td>
<td>To get amount spend</td>
<td>2560.0000</td>
</tr>
</tbody>
</table>

**Success**

    "Guest Name","Guest Email","Total Number of stays","First stay","First Reservation No","First Folio No","Last stay","Last Reservation No","Last Folio No","Next stay","Next Reservation No","Next Folio No","Lifetime Spending"
    "Mr. Michel Joy","","1","2020-03-11","5-1","2","2020-03-11","5-1","2","","","","3863.0000"
    "Mr. Rechel","","1","2020-03-11","5-2","3","2020-03-11","5-2","3","","","","0.0000"

**Error** **Codes**

    Property Deactivated : This property has been deactivated
    OpenAPI Record invalid : Unauthorized Request. This request is not valid for this hotel code
    OpenAPI Deactivated : Auth Code is inactive.
    OpenAPI Request : Invalid API Request. Don't have this API access.

---

### OTH-02 · Retrieve a Company

**Request\_Type:** `CompanyList`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #811

*Tags: Open*

This API provides the company profiles by filters. Most properties use this information to source the correct address for invoicing. Also, hotels use this data to accumulate the booking volume they receive from these companies on an ongoing basis. This API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

|                    |               |                                                      |                      |
|--------------------|---------------|------------------------------------------------------|----------------------|
| **Name**           | **Data Type** | **Description**                                      | **Example**          |
| Request_Type \*    | –             | Use Keyword “CompanyList”                            |                      |
| HotelCode \*       | INT(11)       | Unique Hotel code                                    | XXXX                 |
| AuthCode \*        | VARCHAR(300)  | Unique Authentication code                           | XXXXXXXXXXXXXXXXX    |
| Ids                | VARCHAR(300)  | Add Identity id and also, can add multiple records   | Abc4578lk, yzx7426kj |
| Names              | VARCHAR(300)  | Add Business name and also, can add multiple records | 33Comp, Abc Company  |
| Created. from_date | DATE          | To send a created from date                          | 2020-07-05           |
| Created. to_date   | DATE          | To send a created to date                            | 2020-07-07           |
| Updated. from_date | DATE          | To send a updated from date                          | 2020-07-05           |
| Updated. to_date   | DATE          | To send a updated to date                            | 2020-07-07           |
| isActive           | INT(11)       | Is Active in 1 or 0                                  | 1                    |

**Request **

``` json
{   
"RES_Request": {
        "Request_Type": "CompanyList",
        "Authentication": {
           "HotelCode": "xxxx",
           "AuthCode": "xxxxxxxxxx"
        },
       "Ids": ["abc4578lk","yzx7426kj"],
       "Names": ["33Comp"],
        "Created": {
           "from_date": "2019-12-05",
           "to_date": "2019-12-10"
       },
       "Updated": {
           "from_date": "2019-12-05",
           "to_date": "2019-12-10"
       },
       "isActive":"1"
       }
}
 
```

**Response**

|                |               |                     |                     |
|----------------|---------------|---------------------|---------------------|
| **Name**       | **Data Type** | **Description**     | **Example**         |
| Id             | INT(11)       | Company record id   | 2700000000003934    |
| AccountName    | VARCHAR(255)  | Business name       | 33Comp              |
| AccountCode    | VARCHAR(255)  | Business shortcode  | 33c                 |
| Contact_person | VARCHAR(255)  | Contact person name | 33CompAccount       |
| Address        | VARCHAR(255)  | Address data        | street -5, abc road |
| City           | VARCHAR(255)  | City                | romania             |
| PostalCode     | VARCHAR(255)  | PostalCode          | 895623              |
| State          | VARCHAR(255)  | State               |                     |
| Country        | VARCHAR(255)  | Country             | Romania             |
| Phone          | VARCHAR(100)  | Phone               | 789561234           |
| Mobile         | VARCHAR(100)  | Mobile              | 44545454554         |
| Fax            | VARCHAR(100)  | Fax                 |                     |
| Email          | VARCHAR(255)  | Email               | 33Comp@gmail.com    |
| TaxId          | VARCHAR(255)  | TaxId               | 78                  |
| RegistrationNo | VARCHAR(255)  | RegistrationNo      | vb89                |
| IsActive       | VARCHAR(100)  | IsActive            | false               |

**Success**

``` json
{    "Companies": [
        {
            "Id": "2700000000003934",
            "AccountName": "33Comp",
            "AccountCode": "33c",
            "Contact_person": "33CompAccount",
            "Address": "street -5, abc road",
            "City": "romania",
            "PostalCode": "895623",
            "State": null,
            "Country": "Romania",
            "Phone": "789561234",
            "Mobile": "44545454554",
            "Fax": null,
            "Email": "33Comp@gmail.com",
            "TaxId": "78",
            "RegistrationNo": "vb89",
            "IsActive": false
        }
    ]
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters.                                                 |
| 500            | Error occurred during processing                                             |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 105            | From Date is missing                                                         |
| 107            | To Date is missing                                                           |
| 109            | Please check From and To date. To Date should be greater than fromdate       |
| 208            | Both Updated from_date and to_date are mandatory if any one date is entered  |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive.                                                       |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 106            | From Date is not a valid date                                                |
| 108            | To Date is not a valid date                                                  |
| 112            | Error: Date range is too long. Please provide dates for 1 month.             |
| 210            | No data found                                                                |

---

### OTH-03 · Retrieve A Travel Agent

**Request\_Type:** `TravelAgentList`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #814

*Tags: Open*

This API provides the travel agent profiles by filters. Most properties use this information when a guest books a room through a Travel Agency. Also hotels use this data to accumulate the booking volume they receive from these travel agents on an ongoing basis. This API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Key</strong></td>
<td><strong>Datatype</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “TravelAgentList”</td>
<td></td>
</tr>
<tr class="odd">
<td>AuthCode *</td>
<td>Varchar(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>HotelCode *</td>
<td>Integer(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>Ids</td>
<td>Varchar(20)</td>
<td>ID  of Travel Agent</td>
<td>xxxxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Names</td>
<td>Varchar(20)</td>
<td>Names of travel agent</td>
<td>Peter</td>
</tr>
<tr class="odd">
<td><br />
FromDate</td>
<td><br />
Date</td>
<td>Update From date. [Format: yyyy-mm-dd]</td>
<td>2020-07-01</td>
</tr>
<tr class="even">
<td><br />
ToDate</td>
<td><br />
Date</td>
<td>Update To date. [Format: yyyy-mm-dd]</td>
<td>2020-07-03</td>
</tr>
<tr class="odd">
<td>isActive</td>
<td>INT(1)</td>
<td>Travel agent active or not 1=active, 0=inactive</td>
<td>1 or 0</td>
</tr>
</tbody>
</table>

**Request **

``` json
{
"RES_Request": {
"Request_Type": "TravelAgentList",
"Authentication": {
"HotelCode": "xxxx",
"AuthCode": "xxxxxxxxxx"
},
"Ids": [
"3ed9e2f3-4bba-4df6-8d41-ab1b009b6425"
],
     "Names": [
],
     "Created": {
 "from_date": "2019-12-05",
         "to_date": "2019-12-10"
     },
     "Updated": {
"from_date": "2019-12-05",
         "to_date": "2019-12-10"
     },
     "isActive":"1"

}
}
```

**Response**

|                                 |              |                           |                              |
|---------------------------------|--------------|---------------------------|------------------------------|
| **Name**                        | **Datatype** | **Description**           | **Example**                  |
| Id                              | Integer      | Unique Travel agent id    | xxxxxxxxxxxxx                |
| AccountName                     | String       | Travel agent Businessname | Start Travels                |
| AccountCode                     | String       | Travel aget short code    | STR.                         |
| Contact_person                  | String       | Contact person name       | Mr.James                     |
| Address                         | String       | Address of Travel agent   | New York                     |
| City                            | String       | City name                 | New York                     |
| PostalCode                      | Integer      | Postal code               | 101101                       |
| State                           | String       | State name                | New York                     |
| Country                         | String       | Country name              | USA                          |
| Phone                           | Integer      | Phone number              | 123456                       |
| Mobile                          | Integer      | Mobile number             | 1234567890                   |
| Fax                             | Integer      | Fax Number                | 123456789                    |
| Email                           | String       | Email id                  | abc@rmail.com                |
| TaxId                           | String       | Tax id                    | 1                            |
| RegistrationNo                  | String       | Registration number       | 123                          |
| CommissionPlan                  | String       | Commission plan name      | % on all nights (exclu. Tax) |
| CommissionValue                 | Decimal      | Commission plan value     | 5                            |
| Discount on the standard rate % | Decimal      | Discount percentage       | 5                            |
| IsActive                        | String       | IsActive or not           | 0 or 1                       |

**Success**

``` json
{
    "TravelAgent": [
        {
            "Id": "12340000000000028",
            "AccountName": "ABC",
            "AccountCode": "TABC",
            "Contact_person": "Mr. James",
            "Address": "A234-A",
            "City": "New York",
            "PostalCode": "1000011",
            "State": "New York",
            "Country": "USA",
            "Phone": "9898989898",
            "Mobile": "9898989898",
            "Fax": null,
            "Email": "abc@email.com",
            "TaxId": "1",
            "RegistrationNo": null,
            "CommissionPlan": "% on all nights (exclu. Tax)",
            "CommissionValue": "4.0000",
            "Discount on the standard rate %": "7.0000",
            "IsActive": true
        }
    ]
}
```

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters                                                  |
| 500            | Error occurred during processing.                                            |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 208            | Both Updated from_date and to_date are mandatory if any one date is entered  |
| 210            | No data found                                                                |
| 105            | From Date is missing.                                                        |
| 106            | From Date is not a valid date                                                |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive                                                        |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 205            | Created to_date should be greater than from_date                             |
| 108            | (To Date) – To Date is not a valid date                                      |
| 207            | Updated to_date should be greater than from_dat                              |
| 107            | To Date is missing                                                           |

---

### OTH-04 · Create a Travel Agent

**Request\_Type:** `InsertTravelAgent`  ·  **Method:** GET  ·  **Endpoint:** `https://live.ipms247.com/booking/reservation_api/listing.php?APIKey=XX&request_type=InsertTravelAgent&name=XX&businessname=GreenTravel&salutation=MR&country=India&email=XX&HotelCode=XX&percentdiscount=10&businesssource=true&isusercreated=true&ismailsend=true`  ·  **eZee ref:** #818

*Tags: eZee Reservation Required, Meta Search*

This API helps to insert Travel agents for a property or group of properties in a chain. The API can return data in JSON formats. The web service responds to HTTP GET requests. This API can return data in JSON formats. The web service responds to HTTP GET requests.

You need to take **eZee Reservation** if you want to allow Travel Agent to book a room on behalf of guests.

**End Point URL**

``` json
[BaseUrl]booking/reservation_api/listing.php?APIKey=[API_KEY]&request_type=[Request_Type]&salutation=[salutation]&name=[name]&businessname=[businessname]&country=[country]&email=[email]&HotelCode=[Hotel_Code]&ismailsend=[Ismailsend]
```

**Header**

–

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Name</strong></td>
<td><strong>Data Type</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>[BaseUrl] *</td>
<td>–</td>
<td>Live server URL</td>
<td><a href="https://live.ipms247.com/">https://live.ipms247.com/</a></td>
</tr>
<tr class="odd">
<td>[Request_Type] *</td>
<td></td>
<td>Use Keyword “InsertTravelAgent”</td>
<td></td>
</tr>
<tr class="even">
<td>[Hotel_Code] *</td>
<td>INT(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>[API_KEY] *</td>
<td>VARCHAR(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>[name] *</td>
<td>VARCHAR(100)</td>
<td>Travel agent name</td>
<td>user123</td>
</tr>
<tr class="odd">
<td>[businessname] *</td>
<td>VARCHAR(100)</td>
<td>Business name</td>
<td>xxxxxx</td>
</tr>
<tr class="even">
<td>[salutation] *</td>
<td>VARCHAR(10)</td>
<td>Salutation </td>
<td>xxxx</td>
</tr>
<tr class="odd">
<td>[country] *</td>
<td>VARCHAR(100)</td>
<td>Country name</td>
<td>USA</td>
</tr>
<tr class="even">
<td>[email] *</td>
<td>VARCHAR(100)</td>
<td>Email id</td>
<td>abc@gmail.com</td>
</tr>
<tr class="odd">
<td>bccmailid</td>
<td>VARCHAR(100)</td>
<td>Add Email-id for taking Bcc copy</td>
<td>abc@gmail.com</td>
</tr>
<tr class="even">
<td>businesssource</td>
<td>VARCHAR(10)</td>
<td>Business source</td>
<td>true/false</td>
</tr>
<tr class="odd">
<td>isusercreated</td>
<td>VARCHAR(10)</td>
<td>Is user created</td>
<td>true/false</td>
</tr>
<tr class="even">
<td>percentdiscount</td>
<td>INT(11)</td>
<td>Percentage discount</td>
<td>5</td>
</tr>
<tr class="odd">
<td>address</td>
<td>VARCHAR(200)</td>
<td>Address</td>
<td>A4-Golden street</td>
</tr>
<tr class="even">
<td>city</td>
<td>VARCHAR(100)</td>
<td>City</td>
<td>New York</td>
</tr>
<tr class="odd">
<td>state</td>
<td>VARCHAR(100)</td>
<td>State</td>
<td>california</td>
</tr>
<tr class="even">
<td>zipcode</td>
<td>INT(11)</td>
<td>Zipcode</td>
<td>123456</td>
</tr>
<tr class="odd">
<td>phone</td>
<td>INT(11)</td>
<td>Phone number</td>
<td>123456789</td>
</tr>
<tr class="even">
<td>mobile</td>
<td>INT(11)</td>
<td>Mobile number</td>
<td>1234567890</td>
</tr>
<tr class="odd">
<td>fax</td>
<td>INT(11)</td>
<td>Fax number</td>
<td>123456</td>
</tr>
<tr class="even">
<td>allowtoviewccblock</td>
<td>VARCHAR(10)</td>
<td>For allow to view credit card block</td>
<td>true/false</td>
</tr>
<tr class="odd">
<td>Sendemailtoguest</td>
<td>VARCHAR(10)</td>
<td>For send booking voucher email to Guest if booking made by Travel Agent from booking engine</td>
<td>true/false</td>
</tr>
<tr class="even">
<td>[Ismailsend] *</td>
<td>VARCHAR(10)</td>
<td>For Send email to Travel Agent to share Login Information.<br />
</td>
<td>true/false</td>
</tr>
</tbody>
</table>

**Request **

    https://live.ipms247.com/booking/reservation_api/listing.php?APIKey=XX&request_type=InsertTravelAgent&name=XX&businessname=GreenTravel&salutation=MR&country=India&email=XX&HotelCode=XX&percentdiscount=10&businesssource=true&isusercreated=true&ismailsend=true

**Success**

``` json
{
"26":"2600000000001612",
"1023":"102300000000000844",
"3419":"341900000000000098"
}
```

**Error Codes**

|                  |                                                                                                                                                  |
|------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
| **Error Code**   | **Error Name**                                                                                                                                   |
| HotelCodeEmpty   | Hotel code is empty.                                                                                                                             |
| NORESACC         | This request is valid for Reservation Account only. You may not have opted for Reservation Account Or Hotel Code and Authentication are invalid. |
| UNAUTHREQ        | Unauthorized request. This request is not valid for this hotel code.                                                                             |
| 2                | Cannot Parse Request                                                                                                                             |
| DBConnectError   | Database not connected.                                                                                                                          |
| -1               | No Data found.                                                                                                                                   |
| APIACCESSDENIED  | Your property doesn’t have access to API integration or Key is incorrect. Please contact support for this.                                       |
| MANDATORYPARAM   | \[salutation,name,businessname,email,country \] This Parameters are mandatory.                                                                   |
| UnknownError     | Unknown Error                                                                                                                                    |
| InvalidHotelCode | Invalid Hotel code.Please check your property code.                                                                                              |
| BadRequest       | Bad request type.                                                                                                                                |

---

### OTH-05 · Retrieve Guest

**Request\_Type:** `GuestList`  ·  **Method:** POST  ·  **Endpoint:** `https://live.ipms247.com/pmsinterface/pms_connectivity.php`  ·  **Content-Type:** application/json  ·  **eZee ref:** #1200

*Tags: Open*

This API provides the guest profiles by filters. Most properties maintains guest database to accumulate the volume of returning guest, for building good relationships and create a better guest experience. This API can return data in JSON formats. The web service responds to HTTP POST requests.

**End Point URL**

<https://live.ipms247.com/pmsinterface/pms_connectivity.php>

**Header**

Content-Type: application/json

#### **Parameter**

<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<tbody>
<tr class="odd">
<td><strong>Key</strong></td>
<td><strong>Datatype</strong></td>
<td><strong>Description</strong></td>
<td><strong>Example</strong></td>
</tr>
<tr class="even">
<td>Request_Type *</td>
<td>–</td>
<td>Use Keyword “GuestList”</td>
<td></td>
</tr>
<tr class="odd">
<td>AuthCode *</td>
<td>Varchar(300)</td>
<td>Unique Authentication code</td>
<td>XXXXXXXXXXXXXXXXX</td>
</tr>
<tr class="even">
<td>HotelCode *</td>
<td>Integer(11)</td>
<td>Unique Hotel code</td>
<td>XXXX</td>
</tr>
<tr class="odd">
<td>Ids</td>
<td>Varchar(20)</td>
<td>ID  of Travel Agent</td>
<td>xxxxxxxxxxxx</td>
</tr>
<tr class="even">
<td>Names</td>
<td>Varchar(20)</td>
<td>Names of travel agent</td>
<td>Peter</td>
</tr>
<tr class="odd">
<td><br />
FromDate</td>
<td><br />
Date</td>
<td>Update From date. [Format: yyyy-mm-dd]</td>
<td>2020-07-01</td>
</tr>
<tr class="even">
<td><br />
ToDate</td>
<td><br />
Date</td>
<td>Update To date. [Format: yyyy-mm-dd]</td>
<td>2020-07-03</td>
</tr>
<tr class="odd">
<td>isActive</td>
<td>INT(1)</td>
<td>Staus : active or not<br />
1=active, 0=inactive</td>
<td>1 or 0</td>
</tr>
</tbody>
</table>

**Request **(Without Optional Value)

``` json
{
       "RES_Request": 
        {
                 "Request_Type": "GuestList",
                 "Authentication": {
                       "HotelCode": "xxxxx",
                       "AuthCode": "xxxxxxxxxxxxxxxxxxxxxx"
                 }
        }
}
```

**Request **(With Optional Value)

``` json
{
   "RES_Request":
   {
    "Request_type": "GuestList",
     "Authentication": {
             "HotelCode": "xxxxx",
             "AuthCode": "xxxxxxxxxxxxxxxxxxxxxx"
     },
    "Ids": [ //Optional Filter
        "xxxx",
        "xxxx"
     ],
    "Names": [ //Optional Filter
        "AC Company"
    ],
    "Created": { //Optional Filter
        "from_date": "2019-12-05T00:00:00Z",
        "to_date": "2019-12-10T00:00:00Z"
    },
    "Updated": { //Optional Filter
        "from_date": "2019-12-05T00:00:00Z",
        "to_date": "2019-12-10T00:00:00Z"
    },
    "isActive":"0" //Optional Filter,0 or 1 values where 0 = deactivated company and 1= activated company
  }
}
```

**Response**

|                                 |              |                         |                              |
|---------------------------------|--------------|-------------------------|------------------------------|
| **Name**                        | **Datatype** | **Description**         | **Example**                  |
| Id                              | Integer      | Unique Company agent id | xxxxxxxxxxxxx                |
| AccountName                     | String       | Businessname            | Start Travels                |
| AccountCode                     | String       | Short code              | STR.                         |
| Contact_person                  | String       | Contact person name     | Mr.James                     |
| Address                         | String       | Address of Travel agent | New York                     |
| City                            | String       | City name               | New York                     |
| PostalCode                      | Integer      | Postal code             | 101101                       |
| State                           | String       | State name              | New York                     |
| Country                         | String       | Country name            | USA                          |
| Phone                           | Integer      | Phone number            | 123456                       |
| Mobile                          | Integer      | Mobile number           | 1234567890                   |
| Fax                             | Integer      | Fax Number              | 123456789                    |
| Email                           | String       | Email id                | abc@rmail.com                |
| TaxId                           | String       | Tax id                  | 1                            |
| RegistrationNo                  | String       | Registration number     | 123                          |
| CommissionPlan                  | String       | Commission plan name    | % on all nights (exclu. Tax) |
| CommissionValue                 | Decimal      | Commission plan value   | 5                            |
| Discount on the standard rate % | Decimal      | Discount percentage     | 5                            |
| IsActive                        | String       | Isactive or note        | 0 or 1                       |

**Success**

    Response:
    {
        "Companies": [
            {
                 "Id": "51270000000017",
                 "AccountName": "IBM", //Business Name
                 "AccountCode": "", // Short Code
                 "Contact_person": "Mr. Azad Singh",
                 "Address: "Rheinlanddamm 207-209",
                 “City": "Dortmund",
                 "PostalCode": "44137",
                 "State": "",
                 "Country": "DE",
                 “Phone”:”4334534534”,
                 “Mobile”:”9000123456”,
                 “Fax”:””,
                 “Email”:”azadxyz@yahoo.co.in”,
                 “TaxId”:”43534534534”,
                 “Registration No”:”A3428973449284”,
                 "IsActive": true

            }
        ]
    }

**Error** **Codes**

|                |                                                                              |
|----------------|------------------------------------------------------------------------------|
| **Error Code** | **Error Name**                                                               |
| 100            | Missing required parameters                                                  |
| 500            | Error occurred during processing.                                            |
| 502            | Request Type is missing                                                      |
| 101            | Hotel Code is missing                                                        |
| 102            | Authentication Code is missing                                               |
| 208            | Both Updated from_date and to_date are mandatory if any one date is entered  |
| 210            | No data found                                                                |
| 105            | From Date is missing.                                                        |
| 106            | From Date is not a valid date                                                |
| 301            | Unauthorized Request. Please check hotel code and authentication code        |
| 302            | Unauthorized Request. Integration is not allowed                             |
| 303            | Auth Code is inactive                                                        |
| 201            | Unauthorized request.(Request Type) request is not valid for this hotel code |
| 202            | Unauthorized request. Hotel code is not active                               |
| 205            | Created to_date should be greater than from_date                             |
| 108            | (To Date) – To Date is not a valid date                                      |
| 207            | Updated to_date should be greater than from_dat                              |
| 107            | To Date is missing                                                           |

---



<!-- ====================================================================== -->

