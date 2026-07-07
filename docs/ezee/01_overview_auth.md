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
