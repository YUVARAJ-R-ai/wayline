Excellent, you've successfully moved on to the next error! This is a very specific configuration issue, and the error message gives us everything we need to solve it.

### What the Error Means

Let's break down the error message:

TypeError: Invalid apiVersion "7.17", expected a function or one of _default, 7.6, 7.5, 7.4, 7.3, 7.2, 7.1, 7.0, 6.8, 5.6, 7.7, 7.x, master

- **Who is complaining?** The pelias/schema container. Specifically, the Node.js script create_index.js is using an official Elasticsearch client library to connect to your Elasticsearch database.
    
- **What is it complaining about?** It's complaining about a configuration setting called apiVersion. The script is telling the client library: "I'm going to talk to an Elasticsearch server that is version 7.17".
    
- **Why is it complaining?** The Elasticsearch client library is very particular about the format of this version string. It does **not** recognize "7.17". It explicitly tells you what it does expect: a list of specific older versions, _default, master, or the very important one for us: **7.x**.
    

In short, you've told the Pelias script to use an API version string that the underlying driver doesn't support.

### The Cause

This error is coming directly from your Pelias configuration file. The original guide incorrectly set a patch-level version.

In your pelias/pelias.json file, you have this section:

Generated json

      `{   "esclient": {     "apiVersion": "7.17", // <-- THIS IS THE PROBLEM     "hosts": [       {         "host": "elasticsearch",         "port": 9200       }     ],     "requestTimeout": 120000   },   ... }`
    

### How to Fix It

You need to change "7.17" to the format the library expects, which is "7.x". This tells the library to use a configuration that is compatible with any version of Elasticsearch in the "7" family.

1. **Open your configuration file**: /geospatial_project/pelias/pelias.json
    
2. **Find** the esclient section.
    
3. **Change** the value of apiVersion from "7.17" to "7.x".
    

**Before:**

Generated json

      `"esclient": {   "apiVersion": "7.17",   ... },```  **After:** ```json "esclient": {   "apiVersion": "7.x",   ... },`
    

IGNORE_WHEN_COPYING_START

content_copy download

Use code [with caution](https://support.google.com/legal/answer/13505487). Json

IGNORE_WHEN_COPYING_END

### Next Steps

1. Save the changes to your pelias/pelias.json file.
    
2. Run the schema creation command again:
    
    Generated bash
    
          `docker-compose run --rm pelias_schema`
        
    
    IGNORE_WHEN_COPYING_START
    
    content_copy download
    
    Use code [with caution](https://support.google.com/legal/answer/13505487). Bash
    
    IGNORE_WHEN_COPYING_END
    

It should now connect to Elasticsearch successfully and begin creating the index. You should see output like "pelias schema created successfully".