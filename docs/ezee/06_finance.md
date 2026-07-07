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
