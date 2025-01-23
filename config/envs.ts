import 'dotenv/config';

import * as dotenv from 'dotenv';
import * as joi from 'joi';
import * as path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../../kubernetes/envs/global.env'),
});
dotenv.config({
  path: path.resolve(__dirname, '../../../kubernetes/envs/auth.env'),
});

interface EnvVars {
  AUTH_MICROSERVICE_NAME: string;
  AUTH_MICROSERVICE_HOST: string;
  AUTH_MICROSERVICE_PORT: number;
  AUTH_WEBSOCKET_MICROSERVICE_PORT: number;

  DB_USER: string;
  DB_PASSWORD: string;
  DB_CONNECTION_STRING: string;
  ORACLE_CLIENT_PATH: string;

  JWT_SECRET: string;

  COMS_MICROSERVICE_NAME: string;
  COMS_MICROSERVICE_HOST: string;
  COMS_MICROSERVICE_PORT: number;
}

const envsSchema = joi
  .object({
    AUTH_MICROSERVICE_NAME: joi.string().required(),
    AUTH_MICROSERVICE_HOST: joi.string().default('localhost'),
    AUTH_MICROSERVICE_PORT: joi.number().required(),
    AUTH_WEBSOCKET_MICROSERVICE_PORT: joi.number().required(),

    DB_USER: joi.string().required(),
    DB_PASSWORD: joi.string().required(),
    DB_CONNECTION_STRING: joi.string().required(),
    ORACLE_CLIENT_PATH: joi.string().default('C:/ORACLE/instantclient_12_1'),

    JWT_SECRET: joi.string().default('sanosoft'),

    COMS_MICROSERVICE_NAME: joi.string().required(),
    COMS_MICROSERVICE_HOST: joi.string().default('localhost'),
    COMS_MICROSERVICE_PORT: joi.number().required(),
  })
  .unknown()
  .required();

const { error, value } = envsSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  AUTH_MICROSERVICE_NAME: envVars.AUTH_MICROSERVICE_NAME,
  AUTH_MICROSERVICE_HOST: envVars.AUTH_MICROSERVICE_HOST,
  AUTH_MICROSERVICE_PORT: envVars.AUTH_MICROSERVICE_PORT,
  AUTH_WEBSOCKET_MICROSERVICE_PORT: envVars.AUTH_WEBSOCKET_MICROSERVICE_PORT,

  DB_USER: envVars.DB_USER,
  DB_PASSWORD: envVars.DB_PASSWORD,
  DB_CONNECTION_STRING: envVars.DB_CONNECTION_STRING,
  ORACLE_CLIENT_PATH: envVars.ORACLE_CLIENT_PATH,

  JWT_SECRET: envVars.JWT_SECRET,

  COMS_MICROSERVICE_NAME: envVars.COMS_MICROSERVICE_NAME,
  COMS_MICROSERVICE_HOST: envVars.COMS_MICROSERVICE_HOST,
  COMS_MICROSERVICE_PORT: envVars.COMS_MICROSERVICE_PORT,
};
