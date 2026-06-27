const CONFIG={
  brand:"Make it Simple",
  markerColor:"#00FFFF",
  tolerance:35,
  countdown:3,
  quality:1,
  mirror:true,
  peaceCapture:true,
  peaceDelay:1400,
  defaultLayout:"4",
  defaultTemplate:{"2":"default-2","3":"default-3","4":"default-4","6":"default-6","4v2":"default-4v2","6v2":"default-6v2"},
  layouts:{
    "2":{name:"Strip 2 Foto",photoCount:2,width:800,height:1500},
    "3":{name:"Strip 3 Foto",photoCount:3,width:800,height:1900},
    "4":{name:"Strip 4 Foto",photoCount:4,width:800,height:2300},
    "6":{name:"Strip 6 Foto",photoCount:6,width:800,height:3200},
    "4v2":{name:"Strip 4V2",photoCount:4,width:1200,height:1800},
    "6v2":{name:"Strip 6V2",photoCount:6,width:1200,height:2200}
  },
  templates:[
    {id:"default-2",name:"Default 2",layout:"2",file:"assets/templates/default-2.png"},
    {id:"default-3",name:"Default 3",layout:"3",file:"assets/templates/default-3.png"},
    {id:"default-4",name:"Default 4",layout:"4",file:""},
    {id:"default-6",name:"Default 6",layout:"6",file:""},
    {id:"default-4v2",name:"Default 4V2",layout:"4v2",file:""},
    {id:"default-6v2",name:"Default 6V2",layout:"6v2",file:""},
    {id:"cute",name:"Cute Template",layout:"4",file:"assets/templates/cute.png"},
    {id:"01",name:"01",layout:"3",file:"assets/templates/01.png"},
  ]
};
