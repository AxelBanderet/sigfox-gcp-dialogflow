'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const BIGQUERY = require('@google-cloud/bigquery');
const SIGFOX_INTENT = 'Sigfox Intent';
const DATA_TYPE_ENTITY = 'DataType';
const BIGQUERY_CLIENT = new BIGQUERY();

process.env.DEBUG = 'dialogflow:debug';

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    let intentMap = new Map();
    intentMap.set(SIGFOX_INTENT, getDataFromBigQuery);
    agent.handleRequest(intentMap);
});

function getDataFromBigQuery(agent) {
        const OPTIONS = {
            query: 'SELECT * FROM `sigfoxgcpintegration.sigfox.sensit` ORDER BY seqNumber DESC LIMIT 1',
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