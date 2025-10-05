const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

// Get all glossary terms with filtering, search, and pagination
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      category = 'all',
      status = 'all' // all, verified, unverified, pending
    } = req.query;

    const offset = (page - 1) * limit;

    // Build the main query
    let query = supabaseAdmin
      .from('glossary_terms')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply search filter
    if (search && search.trim()) {
      const searchTerm = search.trim();
      query = query.or(`term_en.ilike.%${searchTerm}%,term_fil.ilike.%${searchTerm}%,definition_en.ilike.%${searchTerm}%,definition_fil.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,verified_by.ilike.%${searchTerm}%`);
    }

    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category', category.toLowerCase());
    }

    // Apply status filter
    if (status && status !== 'all') {
      switch (status) {
        case 'verified':
          query = query.eq('is_verified', true);
          break;
        case 'unverified':
          query = query.eq('is_verified', false);
          break;
        case 'pending':
          query = query.is('is_verified', null);
          break;
      }
    }

    // Get total count for pagination
    const countQuery = supabaseAdmin
      .from('glossary_terms')
      .select('id', { count: 'exact', head: true });

    // Apply same filters to count query
    if (search && search.trim()) {
      const searchTerm = search.trim();
      countQuery.or(`term_en.ilike.%${searchTerm}%,term_fil.ilike.%${searchTerm}%,definition_en.ilike.%${searchTerm}%,definition_fil.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,verified_by.ilike.%${searchTerm}%`);
    }

    if (category && category !== 'all') {
      countQuery.eq('category', category.toLowerCase());
    }

    if (status && status !== 'all') {
      switch (status) {
        case 'verified':
          countQuery.eq('is_verified', true);
          break;
        case 'unverified':
          countQuery.eq('is_verified', false);
          break;
        case 'pending':
          countQuery.is('is_verified', null);
          break;
      }
    }

    // Execute queries
    const [{ data: terms, error: termsError }, { count, error: countError }] = await Promise.all([
      query.range(offset, offset + limit - 1),
      countQuery
    ]);

    if (termsError) {
      console.error('Error fetching glossary terms:', termsError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch glossary terms: ' + termsError.message
      });
    }

    if (countError) {
      console.error('Error counting glossary terms:', countError);
      return res.status(500).json({
        success: false,
        error: 'Failed to count glossary terms: ' + countError.message
      });
    }

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      data: terms || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error in glossary terms route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get single glossary term by ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: term, error } = await supabaseAdmin
      .from('glossary_terms')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Glossary term not found'
        });
      }
      
      console.error('Error fetching glossary term:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch glossary term: ' + error.message
      });
    }

    res.json({
      success: true,
      data: term
    });

  } catch (error) {
    console.error('Error in get glossary term route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Create new glossary term
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      term_en,
      term_fil,
      definition_en,
      definition_fil,
      example_en,
      example_fil,
      category,
      is_verified,
      verified_by
    } = req.body;

    // Validate required fields
    if (!term_en || !category) {
      return res.status(400).json({
        success: false,
        error: 'English term and category are required'
      });
    }

    // Validate category
    const validCategories = ['family', 'criminal', 'civil', 'labor', 'consumer', 'others'];
    if (!validCategories.includes(category.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category. Must be one of: ' + validCategories.join(', ')
      });
    }

    const termData = {
      term_en: term_en.trim(),
      term_fil: term_fil?.trim() || null,
      definition_en: definition_en?.trim() || null,
      definition_fil: definition_fil?.trim() || null,
      example_en: example_en?.trim() || null,
      example_fil: example_fil?.trim() || null,
      category: category.toLowerCase(),
      is_verified: is_verified !== undefined ? is_verified : null,
      verified_by: verified_by?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newTerm, error } = await supabaseAdmin
      .from('glossary_terms')
      .insert(termData)
      .select()
      .single();

    if (error) {
      console.error('Error creating glossary term:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create glossary term: ' + error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Glossary term created successfully',
      data: newTerm
    });

  } catch (error) {
    console.error('Error in create glossary term route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Update glossary term
router.patch('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      term_en,
      term_fil,
      definition_en,
      definition_fil,
      example_en,
      example_fil,
      category,
      is_verified,
      verified_by
    } = req.body;

    // Check if term exists
    const { data: existingTerm, error: fetchError } = await supabaseAdmin
      .from('glossary_terms')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Glossary term not found'
        });
      }
      
      console.error('Error fetching glossary term:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch glossary term: ' + fetchError.message
      });
    }

    // Validate category if provided
    if (category) {
      const validCategories = ['family', 'criminal', 'civil', 'labor', 'consumer', 'others'];
      if (!validCategories.includes(category.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category. Must be one of: ' + validCategories.join(', ')
        });
      }
    }

    // Build update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (term_en !== undefined) updateData.term_en = term_en?.trim() || null;
    if (term_fil !== undefined) updateData.term_fil = term_fil?.trim() || null;
    if (definition_en !== undefined) updateData.definition_en = definition_en?.trim() || null;
    if (definition_fil !== undefined) updateData.definition_fil = definition_fil?.trim() || null;
    if (example_en !== undefined) updateData.example_en = example_en?.trim() || null;
    if (example_fil !== undefined) updateData.example_fil = example_fil?.trim() || null;
    if (category !== undefined) updateData.category = category.toLowerCase();
    if (is_verified !== undefined) updateData.is_verified = is_verified;
    if (verified_by !== undefined) updateData.verified_by = verified_by?.trim() || null;

    const { data: updatedTerm, error: updateError } = await supabaseAdmin
      .from('glossary_terms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating glossary term:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Failed to update glossary term: ' + updateError.message
      });
    }

    res.json({
      success: true,
      message: 'Glossary term updated successfully',
      data: updatedTerm
    });

  } catch (error) {
    console.error('Error in update glossary term route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Delete glossary term
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if term exists
    const { data: existingTerm, error: fetchError } = await supabaseAdmin
      .from('glossary_terms')
      .select('id, term_en')
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Glossary term not found'
        });
      }
      
      console.error('Error fetching glossary term:', fetchError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch glossary term: ' + fetchError.message
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from('glossary_terms')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting glossary term:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete glossary term: ' + deleteError.message
      });
    }

    res.json({
      success: true,
      message: 'Glossary term deleted successfully'
    });

  } catch (error) {
    console.error('Error in delete glossary term route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
