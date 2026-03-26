import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function x(){
  try {
    const u = await p.user.findUnique({where:{email:'himdi@example.com'}});
    console.log('USER_DEBUGLOG:', JSON.stringify(u, null, 2));
    if(u){
      const s = await p.dapurInvestor.findMany({where:{investorId:u.id}, include:{dapurUnit:true}});
      console.log('STAKES_DEBUGLOG:', JSON.stringify(s, null, 2));
    } else {
      console.log('USER_DEBUGLOG: NOT FOUND');
    }
  } catch(e) {
    console.error('ERROR_DEBUGLOG:', e);
  } finally {
    await p.$disconnect();
  }
}
x();
