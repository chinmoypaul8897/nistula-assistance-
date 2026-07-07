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
