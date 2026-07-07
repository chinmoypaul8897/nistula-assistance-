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
