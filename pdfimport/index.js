const pdf = require('pdf-poppler');
const fs = require('fs');
const path = require('path');
const dir = __dirname + "/tmp";
const azureStorage = require('azure-storage');
const containerName = "samples-workitems";  //process.env.BLOB_CONTAINER_NAME;
const accountName = "pdfimportpoc"; //process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accessKey = "ukt9DmPZgahKxy9kqg38z2KOpLSgtvobLgD9zaz7VtOaB8Wiv135i7NEU1d1aKs4sO9NtUH8nWi2hZ3kSKLEDw==";

const blobservice = azureStorage.createBlobService(accountName, accessKey, "https://pdfimportpoc.blob.core.windows.net");


module.exports = async (context, myBlob) => {
    context.log("JavaScript blob trigger function processed blob \n Blob:", context.bindingData.blobTrigger, "\n Blob Size:", myBlob.length, "Bytes");

    if (!context.bindingData.name.endsWith('.pdf')) {
        context.done();
    }

    const file = dir + "/" + context.bindingData.name;
    // TODO work with path.basename
    const outFileName = context.bindingData.name.substring(0, context.bindingData.name.length - 4);

    const outPutDir = __dirname + '/' + outFileName



    checkDirExist(dir);
    checkDirExist(outPutDir);

    fs.writeFile(file, myBlob, async (err) => {
        if (err) {
            throw err;
        }

        await splitPdfIntoJpg(file, outPutDir, outFileName);

        fs.readdir(outPutDir, async (err, files) => {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                let filePath = path.join(outPutDir, file);
                try {
                    blobservice.createBlockBlobFromLocalFile(containerName, outFileName + "/" + file, filePath, (error, result, response) => {

                        if (error) {
                            console.log(error);
                             return;
                        }
                        if(i === files.length -1){
                            removeDir(outPutDir);
                            context.done();
                        }
                    });
                } catch (error) {
                    console.log(err);
                    if(i === files.length -1){
                        removeDir(outPutDir);
                        context.done();
                    }
                }
                
            }
        });

    })


};

const checkDirExist = (path) => {
    if (!fs.existsSync(path)) {
        fs.mkdirSync(path);
    }
}

const splitPdfIntoJpg = async (file, outPutDir, outFileName) => {
    let opts = {
        format: 'jpeg',
        out_dir: outPutDir,
        out_prefix: outFileName,
        page: null
    }
    return await pdf.convert(file, opts);
}

const removeDir = (path) => {
    if (fs.existsSync(path)) {
      const files = fs.readdirSync(path)
   
      if (files.length > 0) {
        files.forEach((filename) => {
          if (fs.statSync(path + "/" + filename).isDirectory()) {
            removeDir(path + "/" + filename)
          } else {
            fs.unlinkSync(path + "/" + filename)
          }
        })
        fs.rmdirSync(path)
      } else {
        fs.rmdirSync(path)
      }
    } else {
      console.log("Directory path not found.")
    }
  }