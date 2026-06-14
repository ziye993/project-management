import app from '../../app.js';
import {baseUpload} from "./baseUpload.js";

app.post('/api/upload/uploadPic', (req, res) => {
  baseUpload("pic", req, res);
});
app.post('/api/upload/uploadMov', (req, res) => {
  baseUpload("mov", req, res);
});
app.post('/api/upload/uploadFile', (req, res) => {
  baseUpload("file", req, res);
});