/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define(['N/query', 'N/ui/serverWidget', 'N/log', 'N/search', 'N/file'], function (query, serverWidget, log, search, file) {
    
    function onRequest(context) {
        if (context.request.method === 'GET') {
            handleGetRequest(context);
        } else if (context.request.method === 'POST') {
            handlePostRequest(context);
        }
    }

    function handleGetRequest(context) {
        try{
            var allCustomers = getAllCustomers();
            log.debug('allCustomers', allCustomers);


            var custWithTran = getCustWithTran();
            log.debug('custWithTran', custWithTran);

            var customerResults = excludeObjects(allCustomers, custWithTran);
            log.debug('customerResults', customerResults);
            log.debug('customerResults.length', customerResults.length);
            createAndShowForm(context, customerResults)
        }catch(ex) {
            log.error('Error:', ex);
            createAndShowForm(context, [], 'An error occurred while processing the request: ' + ex.message);
        }
    }
    function excludeObjects(A, B) {
    return A.filter(objA => !B.some(objB => objA.customerName === objB.customerName));
    }
    function getAllCustomers() {
        var customerSearchObj = search.create({
            type: "customer",
            filters:
            [
                ["parent","anyof","@NONE@"], 
                "AND", 
                ["status","anyof","13"]
            ],
            columns:
            [
                search.createColumn({
         name: "entityid",
         summary: "GROUP",
         label: "Name"
      }),
      search.createColumn({
         name: "email",
         summary: "GROUP",
         label: "Email"
      }),
      search.createColumn({
         name: "phone",
         summary: "GROUP",
         label: "Phone"
      }),
      search.createColumn({
         name: "custentitylocation",
         summary: "GROUP",
         label: "Location"
      })
            ]
        });
        var searchResultCount = customerSearchObj.runPaged().count;
        log.debug("customerSearchObj result count",searchResultCount);
        var results = [];
        var allResults = [];
        var searchResults;
        var start = 0;
        var end = 1000;

        do {
            searchResults = customerSearchObj.run().getRange({
                start: start,
                end: end
            });
            allResults = allResults.concat(searchResults);
            start += 1000;
            end += 1000;

        } while (searchResults.length === 1000);
        allResults.forEach(function(result) {
            var tempObj = {};
            var customerName = result.getValue({ name: "entityid", summary: "GROUP",  label: "Name" })
            var customerEmail = result.getValue({ name: "email", summary: "GROUP",  label: "Name" })
            var customerPhone = result.getValue({ name: "phone", summary: "GROUP",  label: "Name" })
            var customerLocation = result.getText({ name: "custentitylocation", summary: "GROUP",  label: "Name" })
            tempObj.customerName = customerName ? customerName : '';
            tempObj.customerEmail = customerEmail ? customerEmail : '';
            tempObj.customerPhone = customerPhone ? customerPhone : '';
            tempObj.customerLocation = customerLocation ? customerLocation : '';
          
            results.push(tempObj);
        });
        
        return results;
    }

    function getCustWithTran() {
        /*var invoiceSearchObj = search.create({
   type: "invoice",
   filters:
   [
      ["trandate","within","6/1/2023","6/1/2024"], 
      "AND", 
      ["type","anyof","CustInvc"], 
      "AND", 
      ["mainline","is","T"]
   ],
   columns:
   [
      search.createColumn({
         name: "parent",
         join: "customer",
         summary: "GROUP",
         label: "Top Level Parent"
      })
   ]
});*/
      var invoiceSearchObj = search.load({
          id: 'customsearch2457'
      })
var searchResultCount = invoiceSearchObj.runPaged().count;
log.debug("invoiceSearchObj result count",searchResultCount);
      var results = [];
      var allResults = [];
        var searchResults;
        var start = 0;
        var end = 1000;

        do {
            searchResults = invoiceSearchObj.run().getRange({
                start: start,
                end: end
            });
            allResults = allResults.concat(searchResults);
            start += 1000;
            end += 1000;

        } while (searchResults.length === 1000);
        allResults.forEach(function(result) {
            var tempObj = {};
            var customerName = result.getText({ name: "parent", join: "customer", summary: "GROUP", label: "Top Level Parent" })
            tempObj.customerName = customerName;
          
            results.push(tempObj);
        });
        
        return results;
      
    }
  
    function handlePostRequest(context) {
        
        var customerDetails = fetchCustomerDetails(context.request);
        log.debug('Customer Details for CSV', customerDetails);

        var csvContent = generateCSV(customerDetails);
        log.debug('Generated CSV Content', csvContent);

        var csvFile = file.create({
            name: 'Key_Account_Manager_Report.csv',
            fileType: file.Type.CSV,
            contents: csvContent
        });

        context.response.writeFile({
            file: csvFile
        });
    }
    function fetchCustomerDetails(request) {
        var customerDetails = [];
        var lineCount = request.getLineCount({ group: 'custpage_parents' });
        log.debug('lineCount', lineCount);
        for(var i = 0; i < lineCount; i++){
            var tempObj = {};
            var customerName = request.getSublistValue({
                group: 'custpage_parents',
                name: 'custpage_customer_name',
                line: i
            });
            log.debug('customerName', customerName);
            tempObj.customerName = customerName;
            var customerEmail = request.getSublistValue({
                group: 'custpage_parents',
                name: 'custpage_customer_email',
                line: i
            });
            log.debug('customerEmail', customerEmail);
            tempObj.customerEmail = customerEmail;
            var customerPhone = request.getSublistValue({
                group: 'custpage_parents',
                name: 'custpage_customer_phone',
                line: i
            });
            log.debug('customerPhone', customerPhone);
            tempObj.customerPhone = customerPhone;
            var customerLocation = request.getSublistValue({
                group: 'custpage_parents',
                name: 'custpage_customer_location',
                line: i
            });
            log.debug('customerLocation', customerLocation);
            tempObj.customerLocation = customerLocation;

            customerDetails.push(tempObj);
        }
        return customerDetails;
    }
   

    function createAndShowForm(context, customerResults, errorMsg) {
        var formTitle = 'Key Account Manager Report';
      
        var totalCount = customerResults.length;

        if (!errorMsg) {
            formTitle += ' (Total: ' + totalCount + ')';
        }

        var form = serverWidget.createForm({
            title: formTitle
        });

        if (errorMsg) {
            var errorField = form.addField({
                id: 'custpage_error',
                type: serverWidget.FieldType.INLINEHTML,
                label: 'Error'
            });
            errorField.defaultValue = '<div style="color: red; font-weight: bold;">' + errorMsg + '</div>';
        } else {
            var sublist = form.addSublist({
                id: 'custpage_parents',
                type: serverWidget.SublistType.LIST,
                label: 'Results'
            });

            sublist.addField({
                id: 'custpage_customer_name',
                type: serverWidget.FieldType.TEXT,
                label: 'Customer Name'
            });
            
            sublist.addField({
                id: 'custpage_customer_email',
                type: serverWidget.FieldType.TEXT,
                label: 'Customer Email'
            });
            sublist.addField({
                id: 'custpage_customer_phone',
                type: serverWidget.FieldType.TEXT,
                label: 'Customer Phone'
            });
            sublist.addField({
                id: 'custpage_customer_location',
                type: serverWidget.FieldType.TEXT,
                label: 'Location'
            });

            customerResults.forEach(function (customerResult, index) {
                sublist.setSublistValue({
                    id: 'custpage_customer_name',
                    line: index,
                    value: customerResult.customerName || '-'
                });
                sublist.setSublistValue({
                    id: 'custpage_customer_email',
                    line: index,
                    value: customerResult.customerEmail || '-'
                });
                sublist.setSublistValue({
                    id: 'custpage_customer_phone',
                    line: index,
                    value: customerResult.customerPhone || '-'
                });
                sublist.setSublistValue({
                    id: 'custpage_customer_location',
                    line: index,
                    value: customerResult.customerLocation || '-'
                });
            });

            form.addSubmitButton({
                label: 'Download CSV'
            });

            
        }

        context.response.writePage(form);
    }

    

    function generateCSV(data) {
        var csv = 'Customer Name,Customer Email,Customer Phone,Customer Location\n';
        data.forEach(function (row) {
            csv += '"' + (row.customerName || '') + '","' + (row.customerEmail || '') + '","' + (row.customerPhone || '') + '","' + (row.customerLocation || '') + '"\n';
        });
        return csv;
    }

    return {
        onRequest: onRequest
    };
});
