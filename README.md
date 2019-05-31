# An example of how accessing Sigfox data through Google Assistant

## Introduction
Since February 2019 and thanks to @lepistom, Google Cloud Platform can now be integrated with Sigfox Backend. 


Basically, it means that it is now possible to push the data generated from Sigfox enabled devices up to Google Cloud Platform. 
This article presents how to access this data through the Google Assistant enabling quick and easy read from Google Home, Android devices, iPhones ..

## Overview

![Image](/img/Google_Assistant_Scheme.png)

As explained in the related tutorials: [Integrating Sigfox IoT network with Google Cloud Platform](https://cloud.google.com/community/tutorials/sigfox-gw) and [Using Sigfox Sens'it with GCP](https://cloud.google.com/community/tutorials/sigfox-sensit), you can store the data sent by your Sigfox devices into Google Big Query. Therefore, this data can be queried by Google Assistant through DialogFlow. 

## DialogFlow Implementation

DialogFlow is an interface that allow you to recognize sentences sent by the user and to configure appropriate *actions* based on some configuration + machine learning. 

### Sigfox Agent

In Dialogflow, the basic flow of conversation involves these steps:

    - The user gives inputs
    - Your Dialogflow agent parses that input
    - Your agent returns a response to the user

To define how conversations work, you create **intents** in your agent that map user inputs to responses.

When defining a new agent, you will get by default the **Default Welcome intent** and the **Default Fallback Intent** that have respectively the responsability to handle the user welcome and fallback requests.

Then, we need to create the **Sigfox Intent** that will handle requests about Sigfox.

### Sigfox Intent

#### Intent Configuration

I will not go in detail regarding intent configuration since this has already been well explained in several places. In my example, I have just configured the intent to handle a conversation and extract a data type: *temperature* or *humidity*

Also, Google allows to write code that will be triggered at a certain point during he Intent processing. This is called **Fulfillment**. Here below is how it works:
![Image](/img/dialogflow_agent.png)
That's said, it means that the last thing we have to do is to write the portion of code that will ask the data to big query in order deliver it to our Sigfox Intent.

### Fulfillment

#### Define constants

```javascript
'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const BIGQUERY = require('@google-cloud/bigquery');
const SIGFOX_INTENT = 'Sigfox Intent';
const DATA_TYPE_ENTITY = 'DataType';
const BIGQUERY_CLIENT = new BIGQUERY();

process.env.DEBUG = 'dialogflow:debug';
```

#### Implement the function that will query GCP

```javascript
function getDataFromBigQuery(agent) {
        const OPTIONS = {
            query: 'SELECT * FROM `[your_google_cloud_platform_project_name].[your_pubsub_topic_name].[your_table_name]` ORDER BY seqNumber DESC LIMIT 1',
            timeoutMs: 10000,
            useLegacySql: false
        };
        return BIGQUERY_CLIENT.query(OPTIONS).then(results => {
            console.log(JSON.stringify(results[0]));
            const ROWS = results[0];
            const data_type = agent.parameters[DATA_TYPE_ENTITY].toLowerCase();
            if (data_type == "temperature") {
                const temperatureResult = JSON.stringify(ROWS[0].temperature);
                agent.add('The latest measured temperature is ' + temperatureResult + '°C.');
            } else if (data_type == "humidity") {
                const humidityResult = JSON.stringify(ROWS[0].humidity);
                agent.add('The latest measured humidity is ' + humidityResult + '%.');
            } else {
                agent.add("Sorry I did not understand your request.");
            }
          	agent.add(" Would you like to know anything else ?");
        })
            .catch(err => {
                console.error('ERROR:', err);
            });
    }
```
1. The fulfilment will query BigQuery database and select the last line based on the *Sequence Number*.

2. Depending on which data type has been chosen by the user, fulfilment will chose the corresponding field ie temperature or humidity.

3. Fulfilment will add it to the answer

#### Implement fulfillment base block

```javascript
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    let intentMap = new Map();
    intentMap.set(SIGFOX_INTENT, getDataFromBigQuery);
    agent.handleRequest(intentMap);
});
```
This is the base block implemented to map the Sigfox Intent and the method triggering.  




