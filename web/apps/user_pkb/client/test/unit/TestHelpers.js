
describe("GRASP.TestHelpers.substituteValues", function(){
  it('Should recursively substitute values with corresponding elements in replacement array', function () {
    var obj = {
      a:'a',
      b:{
        c:'c',
        created_at:'1980',
        d:[{
          updated_at:'1982'
        }]
      }
    };

    var ethalon = {
      a:'a',
      b:{
        c:'c',
        created_at:'1987',
        d:[{
          updated_at:'1989'
        }]
      }
    };

    GRASP.TestHelpers.substituteValues(obj, ['1980', '1982'], ["1987","1989"]);
    expect(obj).toEqual(ethalon);
  });
});

describe("GRASP.TestHelpers.substituteFields", function(){
  it('Should recursively substitute values of fields in fieldNames with corresponding elements in replacement array', function () {
    var obj = {
      a:'a',
      b:{
        c:'c',
        created_at:'02-03-2984 00:00:00',
        d:[{
          updated_at:'02-03-2984 00:00:00'
        }]
      }
    };

    var ethalon = {
      a:'a',
      b:{
        c:'c',
        created_at:'',
        d:[{
          updated_at:''
        }]
      }
    };

    GRASP.TestHelpers.substituteFields(obj, ['created_at', 'updated_at'], ["",""]);
    expect(obj).toEqual(ethalon);
  });
});

describe("GRASP.TestHelpers.substituteKeys", function(){
  it('Should recursively substitute field names in fieldNames with corresponding elements in replacement array', function () {
    var obj = {
      a:'a',
      b:{
        c:'c',
        created_at:'02-03-2984 00:00:00',
        updated_at:'02-03-2984 00:00:00'
      }
    };
    var ethalon = {
      a:'a',
      y:{
        z:'c',
        created_at:'02-03-2984 00:00:00',
        updated_at:'02-03-2984 00:00:00'
      }
    };

    GRASP.TestHelpers.substituteKeys(obj, ['b', 'c'], ["y","z"]);
    expect(obj).toEqual(ethalon);
  });
});

