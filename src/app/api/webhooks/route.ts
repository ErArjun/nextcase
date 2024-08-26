import OrderReceivedEmail from "@/components/emails/OrderReceivedEmail"
import { db } from "@/db"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { Resend } from "resend"
import stripe, { Stripe } from "stripe"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request, res: Response) {
 try{
    const body=await req.text()
    const signature = headers().get('stripe-signature')

    if(!signature){
        return new Response('Invalid signature', {status: 400})
    }

    const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)

    if(event.type === 'checkout.session.completed'){
       if(!event.data.object.customer_details?.email){
          throw new Error('Missing user email')
       }
       const session=event.data.object as Stripe.Checkout.Session

       const {userId,orderId}=session.metadata || {
        userId: null,
        orderId: null
       }

       if(!userId || !orderId){
           throw new Error('Invalid request Metadata')
       }

       const billingAddress=session.customer_details?.address
       const shippingAddress=session.shipping_details?.address

       const updatedOrder=await db.order.update({
        where:{id:orderId},
        data:{
            isPaid:true,
            shippingAddress:{
                create:{
                    name:session.customer_details!.name!,
                    city:shippingAddress!.city!,
                    country:shippingAddress!.country!,
                    postalCode:shippingAddress!.postal_code!,
                    street:shippingAddress!.line1!,
                    state:shippingAddress!.state!
                }
            },
            billingAddress:{
                create:{
                    name:session.customer_details!.name!,
                    city:billingAddress!.city!,
                    country:billingAddress!.country!,
                    postalCode:billingAddress!.postal_code!,
                    street:billingAddress!.line1!,
                    state:billingAddress!.state!
                }
            }
        }
       })

       await resend.emails.send({
        from:"NextCase <er.arjunbhandari@gmail.com>",
        to:event.data.object.customer_details.email,
        subject:"Thank you for your order",
        react:OrderReceivedEmail({
            orderId,
            orderDate:updatedOrder.createdAt.toLocaleDateString(),
            shippingAddress:{
                name:session.customer_details!.name!,
                city:shippingAddress!.city!,
                country:shippingAddress!.country!,
                postalCode:shippingAddress!.postal_code!,
                street:shippingAddress!.line1!,
                state:shippingAddress!.state!
            }
        })
       })
    }
    return NextResponse.json({result:event,ok:true})
 }
    catch(err){
    console.error(err)
    //send error to sentry

    return NextResponse.json({message:"something went wrong",ok:false},{status:500}) 
    }
}