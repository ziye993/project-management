import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { TRUST_PROXY } from './config/deployment.js';
import { attachAccessMeta } from './middleware/access.js';
import { blockPublicLocalOnly, blockPublicMediaWrite } from './middleware/auth.js';

const app = express();

app.set('trust proxy', TRUST_PROXY);

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(attachAccessMeta);
app.use(blockPublicLocalOnly);
app.use(blockPublicMediaWrite);

export default app;
