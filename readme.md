## SMSAlert ING Statement Downloader

This script is just an example (POC) on how to download monthly statement from ING Business by using Puppeteer and SMSAlert for automatically reading OTA SMS.

### How it works
This script emulates users actions using [Puppeteer](https://pptr.dev/)

1) Establishes a connection to ING Business portal with your username and password
2) ING Send back to you OTA SMS
3) SMSAlert application reads the message and stores it as incoming SMS
4) Script is querying SMSAlert for the latest messages and parses specific OTA message with regex.
5) IF OTA is detected script navigates to the Monthly Statements and downloads the latest one.

### Requirements
1) [SMSAlert Account](https://smsalert.mobi) 
2) ING Business Account
3) SMSAlert application installed and working on the phone that receives the OTA message
4) node & npm

### Install
npm install

define your credentials in import-extras.js
```
const ING_USERNAME = '';
const ING_PASSWORD = '';

const SMSALERT_API_USERNAME = ''
const SMSALERT_API_KEY = ''
```
node import-extras.js

