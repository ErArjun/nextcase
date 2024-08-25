"use server"

import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { db } from "@/db";
import { stripe } from "@/lib/stripe";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Order } from "@prisma/client";

export const createCheckoutSession = async ({configId}:{configId:string}) => { 
    const configuration = await db.configuration.findUnique({   where: { id: configId },  });   
    if (!configuration) {    
        throw new Error("Configuration not found");
      }     

      const {getUser}=getKindeServerSession()
      const user=await getUser()

      if(!user){
        throw new Error("You need to be logged in")
      }

      const {finish,material}=configuration

      let price=BASE_PRICE
      if(material==="polycarbonate"){
          price+=PRODUCT_PRICES.material.polycarbonate
      }
      if(finish==="textured"){
          price+=PRODUCT_PRICES.finish.textured
      }

      let order:Order | undefined=undefined

      // console.log(user.id, configuration.id)

      const existingOrder=await db.order.findFirst({
        where:{
          userId:user.id,
         configurationId:configuration.id
        }
      })

      

      if(existingOrder){
        order=existingOrder
      }else{
        order=await db.order.create({
          data:{
            userId:user.id,
            configurationId:configuration.id,
            amount:price/100
          }
        })
      }


      const product = await stripe.products.create({
        name:"custom iphone Case",
        images:[configuration.imageUrl],
        default_price_data:{
          currency:"usd",
          unit_amount:price,
        }
      })

      const stripeSession=await stripe.checkout.sessions.create({
        success_url:`${process.env.NEXT_PUBLIC_BASE_URL}/thank-you?orderId=${order.id}`,
        cancel_url:`${process.env.NEXT_PUBLIC_BASE_URL}/configure/preview?id=${configuration.id}`,
        payment_method_types:["card","amazon_pay","cashapp"],
        mode:"payment",
        shipping_address_collection:{allowed_countries:["US","CA","DE","NP"]},
        metadata:{
          userId:user.id,
          orderId:order.id
        },
        line_items:[{price:product.default_price as string,quantity:1}]
      })

      return {url:stripeSession.url}
}