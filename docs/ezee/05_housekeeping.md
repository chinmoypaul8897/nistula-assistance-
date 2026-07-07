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
