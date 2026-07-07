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
