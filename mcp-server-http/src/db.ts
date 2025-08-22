import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { logger } from './helpers/logs.js';

const log = logger('db');
const DB_NAME = 'todos';
const COLLECTION_NAME = 'todos';

// MongoDB connection
const mongoUrl = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/?directConnection=true&tls=true&tlsAllowInvalidCertificates=true`;
const client = new MongoClient(mongoUrl);
let db: Db;
let todosCollection: Collection;

async function init() {
  try {
    await client.connect();
    db = client.db(DB_NAME);
    todosCollection = db.collection(COLLECTION_NAME);
    
    // Create index on id field for better performance
    await todosCollection.createIndex({ id: 1 }, { unique: true });
    
    log.success(`Database "${DB_NAME}" initialized.`);
  } catch (error) {
    log.error('Failed to initialize database:', error);
    throw error;
  }
}

// Initialize the database connection
init();

export interface Todo {
  _id?: ObjectId;
  id: number;
  title: string;
  completed: boolean;
}

export async function addTodo(title: string): Promise<Todo> {
  log.info(`Adding TODO: ${title}`);
  
  // Get the next ID by finding the highest existing ID
  const lastTodo = await todosCollection.findOne({}, { sort: { id: -1 } });
  const nextId = lastTodo ? lastTodo.id + 1 : 1;
  
  const todo: Todo = {
    id: nextId,
    title,
    completed: false
  };
  
  const result = await todosCollection.insertOne(todo);
  return { ...todo, _id: result.insertedId };
}

export async function listTodos(): Promise<Array<{ id: number; title: string; completed: boolean }>> {
  log.info('Listing all TODOs...');
  const todos = await todosCollection.find({}, { projection: { _id: 0, id: 1, title: 1, completed: 1 } }).toArray();
  return todos.map(todo => ({
    id: todo.id,
    title: todo.title,
    completed: todo.completed
  }));
}

export async function completeTodo(id: number): Promise<{ changes: number }> {
  log.info(`Completing TODO with ID: ${id}`);
  const result = await todosCollection.updateOne(
    { id },
    { $set: { completed: true } }
  );
  return { changes: result.modifiedCount };
}

export async function deleteTodo(id: number): Promise<{ title: string } | null> {
  log.info(`Deleting TODO with ID: ${id}`);
  const todo = await todosCollection.findOne({ id }, { projection: { title: 1 } });
  
  if (!todo) {
    log.error(`TODO with ID ${id} not found`);
    return null;
  }
  
  await todosCollection.deleteOne({ id });
  log.success(`TODO with ID ${id} deleted`);
  return { title: todo.title };
}
