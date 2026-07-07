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
