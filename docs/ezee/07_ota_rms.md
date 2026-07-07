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
