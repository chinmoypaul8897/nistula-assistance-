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
