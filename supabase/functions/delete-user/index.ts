import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, isAdminAction = false } = await req.json()
    console.log('Delete user request:', { userId, isAdminAction })

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the current user from the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Set the auth token for the client
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !currentUser) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // If admin action, verify admin role
    if (isAdminAction) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    } else {
      // If not admin action, user can only delete their own account
      if (currentUser.id !== userId) {
        return new Response(
          JSON.stringify({ error: 'You can only delete your own account' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    console.log('Starting user deletion process for:', userId)

    // Delete user's related data first (foreign key dependencies)
    
    // 1. Delete PIX payments
    const { error: pixError } = await supabaseClient
      .from('pix_payments')
      .delete()
      .eq('user_id', userId)
    
    if (pixError) {
      console.error('Error deleting PIX payments:', pixError)
    } else {
      console.log('PIX payments deleted successfully')
    }

    // 2. Delete raffle tickets
    const { error: ticketsError } = await supabaseClient
      .from('raffle_tickets')
      .delete()
      .eq('user_id', userId)
    
    if (ticketsError) {
      console.error('Error deleting raffle tickets:', ticketsError)
    } else {
      console.log('Raffle tickets deleted successfully')
    }

    // 3. Delete affiliate referrals (where user is referred)
    const { error: referralsError } = await supabaseClient
      .from('affiliate_referrals')
      .delete()
      .eq('referred_user_id', userId)
    
    if (referralsError) {
      console.error('Error deleting affiliate referrals:', referralsError)
    } else {
      console.log('Affiliate referrals deleted successfully')
    }

    // 4. Delete affiliate record (if user is an affiliate)
    const { error: affiliateError } = await supabaseClient
      .from('affiliates')
      .delete()
      .eq('user_id', userId)
    
    if (affiliateError) {
      console.error('Error deleting affiliate record:', affiliateError)
    } else {
      console.log('Affiliate record deleted successfully')
    }

    // 5. Delete weekly affiliate winners
    const { error: weeklyWinnersError } = await supabaseClient
      .from('weekly_affiliate_winners')
      .delete()
      .eq('affiliate_id', userId)
    
    if (weeklyWinnersError) {
      console.error('Error deleting weekly winners:', weeklyWinnersError)
    } else {
      console.log('Weekly winners deleted successfully')
    }

    // 6. Delete affiliate bonus numbers
    const { error: bonusError } = await supabaseClient
      .from('affiliate_bonus_numbers')
      .delete()
      .eq('affiliate_id', userId)
    
    if (bonusError) {
      console.error('Error deleting bonus numbers:', bonusError)
    } else {
      console.log('Bonus numbers deleted successfully')
    }

    // 7. Delete user profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete user profile' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.log('Profile deleted successfully')
    }

    // 8. Finally, delete the auth user (only admin can do this)
    if (isAdminAction) {
      const { error: deleteUserError } = await supabaseClient.auth.admin.deleteUser(userId)
      
      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError)
        return new Response(
          JSON.stringify({ error: 'Failed to delete user from auth' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        console.log('Auth user deleted successfully')
      }
    }

    console.log('User deletion completed successfully for:', userId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully',
        deletedUserId: userId 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})